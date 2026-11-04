"""Temporal trace engine for Mule Matrix.

Performs time-respecting forward and backward graph traversal,
applies provenance accounting (FIFO/Proportional), detects cycles safely,
classifies endpoints, and records trace boundaries.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.account import Account, AccountType
from app.models.assessment import AccountAssessment, AssessmentCategory
from app.models.case import Case, CaseStatus
from app.models.endpoint import EndpointCategory, EndpointObservation
from app.models.fund_lot import FundLot, LotStatus
from app.models.origin import Origin
from app.models.trace_run import AllocationPolicy, TraceDirection, TraceRun, TraceStatus
from app.models.transaction import PaymentChannel, Transaction, TransactionStatus
from app.services.assessment_service import AssessmentService
from app.services.audit_service import AuditService
from app.services.graph_engine import GraphEngine
from app.services.provenance_engine import ProvenanceEngine, quantize_amount


class TraceEngine:
    @staticmethod
    def execute_trace(
        db: Session,
        case: Case,
        origin: Origin,
        policy: AllocationPolicy = AllocationPolicy.FIFO,
        direction: TraceDirection = TraceDirection.FORWARD,
        max_hops: int = 10,
        window_start: Optional[datetime] = None,
        window_end: Optional[datetime] = None,
        actor: str = "investigator",
    ) -> TraceRun:
        """Run a full temporal trace on an origin within a case."""
        trace_run = TraceRun(
            case_id=case.id,
            origin_id=origin.id,
            allocation_policy=policy,
            direction=direction,
            max_hops=max_hops,
            window_start=window_start,
            window_end=window_end,
            status=TraceStatus.RUNNING,
            total_attributed=Decimal("0.00"),
            total_endpoints=0,
            total_accounts_discovered=0,
            cycles_detected=0,
            started_at=datetime.now(timezone.utc),
        )
        db.add(trace_run)
        db.commit()
        db.refresh(trace_run)

        try:
            # 1. Fetch seed transaction and receiving account
            seed_tx = db.query(Transaction).filter(Transaction.id == origin.seed_transaction_id).first()
            if not seed_tx:
                raise ValueError("Seed transaction not found.")

            seed_receiver_id = seed_tx.receiver_account_id
            seed_sender_id = seed_tx.sender_account_id

            # 2. Check for or create root lot
            root_lot = (
                db.query(FundLot)
                .filter(FundLot.origin_id == origin.id, FundLot.parent_lot_id == None)
                .first()
            )
            if not root_lot:
                root_lot = ProvenanceEngine.create_initial_lot(db, origin, seed_receiver_id)

            # 3. Load all accounts and transactions for graph and pattern evaluation
            all_accounts = db.query(Account).all()
            all_txs = db.query(Transaction).all()

            accounts_by_id = {acc.id: acc for acc in all_accounts}
            accounts_by_pseudo = {acc.pseudo_id: acc for acc in all_accounts}

            # Build NetworkX graph to find global cycles
            G = GraphEngine.build_transaction_graph(all_accounts, all_txs)
            cycles = GraphEngine.detect_cycles(G)
            trace_run.cycles_detected = len(cycles)

            # Traversal structures
            discovered_account_ids: Set[UUID] = {seed_receiver_id, seed_sender_id}
            account_attributed: Dict[UUID, Decimal] = {
                seed_receiver_id: quantize_amount(origin.origin_amount),
                seed_sender_id: Decimal("0.00"),
            }
            account_hops: Dict[UUID, int] = {seed_receiver_id: 0, seed_sender_id: 0}

            # Queue contains active fund lots to trace forward: (lot, incoming_timestamp, path_tuples)
            # path_tuples prevent infinite loops in cyclical transaction graphs
            queue: List[Tuple[FundLot, datetime, List[UUID]]] = [
                (root_lot, seed_tx.timestamp, [seed_receiver_id])
            ]

            endpoints_created: List[EndpointObservation] = []
            visited_tx_ids: Set[UUID] = set()

            while queue:
                current_lot, arrival_time, path = queue.pop(0)

                # Check hop limit
                if current_lot.hop_count >= max_hops:
                    # Boundary reached
                    ep = EndpointObservation(
                        trace_run_id=trace_run.id,
                        lot_id=current_lot.id,
                        account_id=current_lot.current_account_id,
                        category=EndpointCategory.NO_FURTHER_RECORD,
                        attributed_amount=current_lot.remaining_amount,
                        last_transaction_id=current_lot.source_transaction_id,
                        reason=f"Investigation hop limit ({max_hops}) reached.",
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(ep)
                    endpoints_created.append(ep)
                    continue

                curr_acc = accounts_by_id.get(current_lot.current_account_id)
                if not curr_acc:
                    continue

                # Query completed outgoing transactions from current_account occurring AFTER arrival_time
                eligible_txs = [
                    tx for tx in all_txs
                    if tx.sender_account_id == current_lot.current_account_id
                    and tx.status == TransactionStatus.POSTED
                    and tx.timestamp > arrival_time
                    and (not window_start or tx.timestamp >= window_start)
                    and (not window_end or tx.timestamp <= window_end)
                    and tx.id not in visited_tx_ids
                ]

                # Sort chronologically
                eligible_txs.sort(key=lambda x: x.timestamp)

                if not eligible_txs or current_lot.remaining_amount <= Decimal("0.00"):
                    # No further eligible outgoing events: Retained balance or no further record
                    reason_str = "Attributed funds remain in account balance at end of observation window."
                    ep_category = EndpointCategory.RETAINED_BALANCE
                    ep = EndpointObservation(
                        trace_run_id=trace_run.id,
                        lot_id=current_lot.id,
                        account_id=current_lot.current_account_id,
                        category=ep_category,
                        attributed_amount=current_lot.remaining_amount,
                        last_transaction_id=current_lot.source_transaction_id,
                        reason=reason_str,
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(ep)
                    endpoints_created.append(ep)
                    continue

                # Process eligible outgoing transactions
                for out_tx in eligible_txs:
                    if current_lot.remaining_amount <= Decimal("0.00"):
                        break

                    # Check for cycle in this branch path
                    receiver_id = out_tx.receiver_account_id
                    is_cycle_hop = receiver_id in path

                    # Calculate attributed portion under policy
                    allocated = ProvenanceEngine.calculate_allocation(
                        lot=current_lot,
                        transaction=out_tx,
                        account_balance=curr_acc.current_balance,
                        policy=policy,
                    )

                    if allocated <= Decimal("0.00"):
                        continue

                    visited_tx_ids.add(out_tx.id)

                    # Split parent lot into child lot
                    child_lot = ProvenanceEngine.split_lot(
                        db=db,
                        parent_lot=current_lot,
                        allocation_amount=allocated,
                        destination_account_id=receiver_id,
                        transaction=out_tx,
                    )

                    discovered_account_ids.add(receiver_id)
                    account_attributed[receiver_id] = quantize_amount(
                        account_attributed.get(receiver_id, Decimal("0.00")) + allocated
                    )
                    account_hops[receiver_id] = max(account_hops.get(receiver_id, 0), child_lot.hop_count)

                    receiver_acc = accounts_by_id.get(receiver_id)
                    receiver_bank = receiver_acc.bank if receiver_acc else None

                    # Check for Terminal Endpoints
                    is_endpoint = False
                    ep_cat = None
                    ep_reason = ""

                    # Endpoint Check 1: ATM Withdrawal
                    if out_tx.channel == PaymentChannel.ATM or "ATM" in (out_tx.description or "").upper():
                        is_endpoint = True
                        ep_cat = EndpointCategory.ATM_WITHDRAWAL
                        ep_reason = f"Cash withdrawal observed via ATM channel ({out_tx.payment_reference or 'Terminal'}). Account trail ends at cash out."

                    # Endpoint Check 2: Merchant Payment
                    elif (
                        receiver_acc
                        and receiver_acc.account_type == AccountType.MERCHANT
                        or out_tx.channel == PaymentChannel.MERCHANT_POS
                    ):
                        is_endpoint = True
                        ep_cat = EndpointCategory.MERCHANT_PAYMENT
                        ep_reason = "Payment settled with verified commercial merchant. Not assumed criminal."

                    # Endpoint Check 3: Non-participating External Bank
                    elif receiver_bank and not receiver_bank.is_participating:
                        is_endpoint = True
                        ep_cat = EndpointCategory.EXTERNAL_BANK
                        ep_reason = f"Funds transferred to non-participating institution ({receiver_bank.name}). External network boundary reached."

                    # Endpoint Check 4: Prepaid / Wallet
                    elif receiver_acc and receiver_acc.account_type == AccountType.WALLET:
                        is_endpoint = True
                        ep_cat = EndpointCategory.WALLET_TRANSFER
                        ep_reason = "Prepaid wallet load observed. Wallet provider records required for further tracking."

                    # Endpoint Check 5: Cycle termination
                    elif is_cycle_hop:
                        is_endpoint = True
                        ep_cat = EndpointCategory.NO_FURTHER_RECORD
                        ep_reason = f"Circular flow detected returning to previously visited account {receiver_acc.pseudo_id if receiver_acc else 'N/A'}. Traversal stopped to prevent infinite loop."

                    if is_endpoint:
                        ep = EndpointObservation(
                            trace_run_id=trace_run.id,
                            lot_id=child_lot.id,
                            account_id=receiver_id,
                            category=ep_cat,
                            attributed_amount=allocated,
                            last_transaction_id=out_tx.id,
                            reason=ep_reason,
                            created_at=datetime.now(timezone.utc),
                        )
                        db.add(ep)
                        endpoints_created.append(ep)
                    else:
                        # Continue tracing downstream
                        queue.append((child_lot, out_tx.timestamp, path + [receiver_id]))

                # If parent lot still has remaining unspent balance after evaluating all outgoing transactions
                if current_lot.remaining_amount > Decimal("0.00"):
                    ep = EndpointObservation(
                        trace_run_id=trace_run.id,
                        lot_id=current_lot.id,
                        account_id=current_lot.current_account_id,
                        category=EndpointCategory.RETAINED_BALANCE,
                        attributed_amount=current_lot.remaining_amount,
                        last_transaction_id=current_lot.source_transaction_id,
                        reason="Residual attributed funds retained in account balance.",
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(ep)
                    endpoints_created.append(ep)

            # 4. Perform Account Assessments for all discovered accounts
            assessments_to_persist = []
            cycle_pseudo_paths = cycles  # e.g. [["PSEUDO-A", "PSEUDO-B", "PSEUDO-C"]]

            for acc_id in discovered_account_ids:
                acc = accounts_by_id.get(acc_id)
                if not acc:
                    continue

                is_seed = (acc_id == seed_sender_id)
                attr_amt = account_attributed.get(acc_id, Decimal("0.00"))
                hop = account_hops.get(acc_id, 0)
                is_cross = (acc.bank_id != seed_tx.sender_bank_id)

                assessment_data = AssessmentService.assess_account(
                    account=acc,
                    attributed_amount=attr_amt,
                    all_transactions=all_txs,
                    is_seed_account=is_seed,
                    hop_count=hop,
                    is_cross_bank=is_cross,
                    cycle_paths=cycle_pseudo_paths,
                )
                assessment_data["account_id"] = acc.id
                assessment_data["attributed_amount"] = attr_amt
                assessments_to_persist.append(assessment_data)

            AssessmentService.persist_assessments(db, trace_run, assessments_to_persist)

            # 5. Finalize TraceRun stats
            trace_run.total_attributed = quantize_amount(origin.origin_amount)
            trace_run.total_endpoints = len(endpoints_created)
            trace_run.total_accounts_discovered = len(discovered_account_ids)
            trace_run.status = TraceStatus.COMPLETED
            trace_run.completed_at = datetime.now(timezone.utc)

            # Update case status
            case.status = CaseStatus.TRACED

            db.commit()
            db.refresh(trace_run)

            # Log audit event
            AuditService.log(
                db=db,
                actor=actor,
                action="TRACE_RUN_COMPLETED",
                target_type="trace_run",
                target_id=str(trace_run.id),
                details={
                    "case_ref": case.case_ref,
                    "origin_ref": origin.origin_ref,
                    "policy": policy.value,
                    "endpoints_count": len(endpoints_created),
                    "discovered_accounts": len(discovered_account_ids),
                    "cycles_detected": trace_run.cycles_detected,
                },
            )

            return trace_run

        except Exception as e:
            trace_run.status = TraceStatus.FAILED
            trace_run.error_message = str(e)
            trace_run.completed_at = datetime.now(timezone.utc)
            db.commit()
            raise

    @staticmethod
    def get_graph_data(
        db: Session,
        trace_run_id: UUID,
    ) -> Dict[str, Any]:
        """Produce frontend-ready nodes and edges for React Flow visualization."""
        trace_run = db.query(TraceRun).filter(TraceRun.id == trace_run_id).first()
        if not trace_run:
            raise ValueError("Trace run not found.")

        assessments = db.query(AccountAssessment).filter(AccountAssessment.trace_run_id == trace_run_id).all()
        endpoints = db.query(EndpointObservation).filter(EndpointObservation.trace_run_id == trace_run_id).all()
        lots = db.query(FundLot).filter(FundLot.origin_id == trace_run.origin_id).all()

        endpoint_map = {ep.account_id: ep for ep in endpoints}
        assessment_map = {a.account_id: a for a in assessments}

        # Find seed tx
        origin = trace_run.origin
        seed_tx = origin.seed_transaction if origin else None
        seed_sender_id = seed_tx.sender_account_id if seed_tx else None

        nodes = []
        for a in assessments:
            acc = a.account
            ep = endpoint_map.get(acc.id)
            is_seed = (acc.id == seed_sender_id)

            nodes.append({
                "id": str(acc.id),
                "label": acc.pseudo_id,
                "pseudo_id": acc.pseudo_id,
                "account_id": str(acc.id),
                "bank_code": acc.bank.code if acc.bank else "UNKNOWN",
                "bank_name": acc.bank.name if acc.bank else "Unknown Bank",
                "account_type": acc.account_type.value,
                "current_balance": acc.current_balance,
                "assessment_category": a.category,
                "confidence_score": a.confidence_score,
                "attributed_amount": a.attributed_amount,
                "is_seed": is_seed,
                "is_endpoint": ep is not None,
                "endpoint_type": ep.category.value if ep else None,
            })

        # Edges from child lots and lineage
        edges = []
        edge_seen = set()

        # Seed transaction edge
        if seed_tx:
            edge_id = f"edge-{seed_tx.id}"
            edges.append({
                "id": edge_id,
                "source": str(seed_tx.sender_account_id),
                "target": str(seed_tx.receiver_account_id),
                "transaction_id": str(seed_tx.id),
                "transaction_ref": seed_tx.transaction_ref,
                "amount": seed_tx.amount,
                "currency": seed_tx.currency,
                "timestamp": seed_tx.timestamp,
                "status": seed_tx.status.value,
                "channel": seed_tx.channel.value,
                "attributed_amount": origin.origin_amount,
                "is_reversal": False,
            })
            edge_seen.add(edge_id)

        for lot in lots:
            if lot.source_transaction_id and lot.parent_lot_id:
                parent_lot = lot.parent_lot
                tx = lot.source_transaction
                if tx and parent_lot:
                    edge_id = f"edge-{tx.id}-{lot.id}"
                    if edge_id not in edge_seen:
                        edges.append({
                            "id": edge_id,
                            "source": str(parent_lot.current_account_id),
                            "target": str(lot.current_account_id),
                            "transaction_id": str(tx.id),
                            "transaction_ref": tx.transaction_ref,
                            "amount": tx.amount,
                            "currency": tx.currency,
                            "timestamp": tx.timestamp,
                            "status": tx.status.value,
                            "channel": tx.channel.value,
                            "attributed_amount": lot.attributed_amount,
                            "is_reversal": tx.is_reversal,
                        })
                        edge_seen.add(edge_id)

        reconciliation = ProvenanceEngine.reconcile_origin(db, origin)

        return {
            "nodes": nodes,
            "edges": edges,
            "summary": {
                "trace_run_id": str(trace_run.id),
                "origin_ref": origin.origin_ref,
                "status": trace_run.status.value,
                "allocation_policy": trace_run.allocation_policy.value,
                "total_attributed": trace_run.total_attributed,
                "discovered_accounts": trace_run.total_accounts_discovered,
                "endpoints_count": trace_run.total_endpoints,
                "cycles_detected": trace_run.cycles_detected,
                "reconciliation": reconciliation,
            },
        }
