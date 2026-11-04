"""CBDC-inspired fund provenance engine.

Handles origins, parent-child fund lots, FIFO & Proportional allocation,
reconciliation, reversals, and attribution invariant checks.
Uses exact Python Decimal for all monetary math.
"""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Tuple
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.endpoint import EndpointCategory, EndpointObservation
from app.models.fund_lot import FundLot, LotStatus
from app.models.lineage_event import LineageEvent, LineageEventType
from app.models.origin import Origin, OriginStatus
from app.models.trace_run import AllocationPolicy
from app.models.transaction import Transaction, TransactionStatus


def quantize_amount(val: Decimal) -> Decimal:
    """Format decimal to exactly 2 decimal places."""
    if isinstance(val, (int, float, str)):
        val = Decimal(str(val))
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class InvariantViolationError(Exception):
    """Raised when a fund provenance invariant is breached."""
    pass


class ProvenanceEngine:
    @staticmethod
    def create_origin(
        db: Session,
        case_id: UUID,
        seed_tx: Transaction,
        origin_amount: Optional[Decimal] = None,
    ) -> Origin:
        """Create a suspicious-origin record from a seed transaction."""
        if seed_tx.status != TransactionStatus.POSTED:
            raise ValueError(f"Seed transaction must be POSTED, got {seed_tx.status}")

        amount = quantize_amount(origin_amount if origin_amount is not None else seed_tx.amount)
        if amount <= Decimal("0.00"):
            raise ValueError("Origin amount must be strictly positive.")
        if amount > seed_tx.amount:
            raise InvariantViolationError("Origin amount cannot exceed seed transaction amount.")

        origin_ref = f"ORG-{uuid4().hex[:8].upper()}"
        origin = Origin(
            origin_ref=origin_ref,
            case_id=case_id,
            seed_transaction_id=seed_tx.id,
            origin_amount=amount,
            currency=seed_tx.currency,
            status=OriginStatus.ACTIVE,
            created_at=datetime.now(timezone.utc),
        )
        db.add(origin)
        db.commit()
        db.refresh(origin)
        return origin

    @staticmethod
    def create_initial_lot(
        db: Session,
        origin: Origin,
        receiving_account_id: UUID,
    ) -> FundLot:
        """Create the root lot (hop 0) at the seed transaction's receiving account."""
        lot_ref = f"LOT-{uuid4().hex[:8].upper()}"
        lot = FundLot(
            lot_ref=lot_ref,
            origin_id=origin.id,
            parent_lot_id=None,
            current_account_id=receiving_account_id,
            attributed_amount=origin.origin_amount,
            remaining_amount=origin.origin_amount,
            status=LotStatus.ACTIVE,
            source_transaction_id=origin.seed_transaction_id,
            hop_count=0,
            created_at=datetime.now(timezone.utc),
        )
        db.add(lot)
        db.flush()

        event = LineageEvent(
            lot_id=lot.id,
            event_type=LineageEventType.CREATED,
            transaction_id=origin.seed_transaction_id,
            amount=origin.origin_amount,
            from_account_id=None,
            to_account_id=receiving_account_id,
            description=f"Initial provenance lot created from origin {origin.origin_ref}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(event)
        db.commit()
        db.refresh(lot)
        return lot

    @staticmethod
    def split_lot(
        db: Session,
        parent_lot: FundLot,
        allocation_amount: Decimal,
        destination_account_id: UUID,
        transaction: Transaction,
    ) -> FundLot:
        """Split a portion of parent_lot into a new child lot transferred to destination."""
        alloc = quantize_amount(allocation_amount)

        if alloc <= Decimal("0.00"):
            raise ValueError("Allocation amount must be strictly positive.")
        if alloc > parent_lot.remaining_amount:
            raise InvariantViolationError(
                f"Cannot allocate {alloc} from lot {parent_lot.lot_ref} with remaining {parent_lot.remaining_amount}"
            )
        if alloc > transaction.amount:
            raise InvariantViolationError(
                f"Attributed amount {alloc} cannot exceed transaction amount {transaction.amount}"
            )

        # Deduct from parent lot
        parent_lot.remaining_amount = quantize_amount(parent_lot.remaining_amount - alloc)
        if parent_lot.remaining_amount == Decimal("0.00"):
            parent_lot.status = LotStatus.CONSUMED
        else:
            parent_lot.status = LotStatus.SPLIT

        # Create child lot
        child_lot = FundLot(
            lot_ref=f"LOT-{uuid4().hex[:8].upper()}",
            origin_id=parent_lot.origin_id,
            parent_lot_id=parent_lot.id,
            current_account_id=destination_account_id,
            attributed_amount=alloc,
            remaining_amount=alloc,
            status=LotStatus.ACTIVE,
            source_transaction_id=transaction.id,
            hop_count=parent_lot.hop_count + 1,
            created_at=datetime.now(timezone.utc),
        )
        db.add(child_lot)
        db.flush()

        # Record lineage event
        lineage = LineageEvent(
            lot_id=child_lot.id,
            event_type=LineageEventType.SPLIT,
            transaction_id=transaction.id,
            amount=alloc,
            from_account_id=parent_lot.current_account_id,
            to_account_id=destination_account_id,
            description=f"Split {alloc} from parent {parent_lot.lot_ref} via {transaction.transaction_ref}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(lineage)
        db.commit()
        db.refresh(child_lot)
        db.refresh(parent_lot)
        return child_lot

    @staticmethod
    def calculate_allocation(
        lot: FundLot,
        transaction: Transaction,
        account_balance: Decimal,
        policy: AllocationPolicy,
    ) -> Decimal:
        """Calculate the attributed suspicious portion of an outgoing transaction."""
        tx_amount = quantize_amount(transaction.amount)
        available_lot_amount = quantize_amount(lot.remaining_amount)

        if available_lot_amount <= Decimal("0.00") or tx_amount <= Decimal("0.00"):
            return Decimal("0.00")

        if policy == AllocationPolicy.FIFO:
            # Under FIFO: oldest suspicious lot consumed first
            return min(available_lot_amount, tx_amount)

        elif policy == AllocationPolicy.PROPORTIONAL:
            # Under Proportional:
            effective_balance = max(account_balance, available_lot_amount)
            if effective_balance <= Decimal("0.00"):
                fraction = Decimal("1.00")
            else:
                fraction = available_lot_amount / effective_balance
            allocated = quantize_amount(tx_amount * fraction)
            return min(allocated, available_lot_amount, tx_amount)

        return min(available_lot_amount, tx_amount)

    @staticmethod
    def handle_reversal(
        db: Session,
        reversal_tx: Transaction,
    ) -> Optional[LineageEvent]:
        """Record a compensating reversal event without deleting historical transactions."""
        if not reversal_tx.reversal_of_id:
            return None

        original_tx_id = reversal_tx.reversal_of_id
        child_lots = (
            db.query(FundLot)
            .filter(FundLot.source_transaction_id == original_tx_id)
            .all()
        )

        for child in child_lots:
            child.status = LotStatus.REVERSED
            if child.parent_lot_id:
                parent = db.query(FundLot).filter(FundLot.id == child.parent_lot_id).first()
                if parent:
                    parent.remaining_amount = quantize_amount(
                        parent.remaining_amount + child.attributed_amount
                    )
                    parent.status = LotStatus.ACTIVE

            event = LineageEvent(
                lot_id=child.id,
                event_type=LineageEventType.REVERSED,
                transaction_id=reversal_tx.id,
                amount=child.attributed_amount,
                from_account_id=child.current_account_id,
                to_account_id=child.parent_lot.current_account_id if child.parent_lot else None,
                description=f"Compensating reversal of tx {original_tx_id} via {reversal_tx.transaction_ref}",
                created_at=datetime.now(timezone.utc),
            )
            db.add(event)

        db.commit()
        return None

    @staticmethod
    def reconcile_origin(db: Session, origin: Origin) -> dict:
        """Verify the conservation invariant for an origin:

        Origin Amount = Sum(Active In-Transit / Leaf Balances)
                      + Sum(Terminal Off-ramp Endpoints: ATM, Merchant, External, Wallet)
                      + Sum(Retained Balances)
                      + Sum(Reversals)
        """
        endpoints = (
            db.query(EndpointObservation)
            .join(FundLot, EndpointObservation.lot_id == FundLot.id)
            .filter(FundLot.origin_id == origin.id)
            .all()
        )

        terminal_offramp_amt = Decimal("0.00")
        retained_amt = Decimal("0.00")
        other_endpoints_amt = Decimal("0.00")

        endpoint_details = []
        for ep in endpoints:
            attr = quantize_amount(ep.attributed_amount)
            if ep.category == EndpointCategory.RETAINED_BALANCE:
                retained_amt += attr
            elif ep.category in [
                EndpointCategory.ATM_WITHDRAWAL,
                EndpointCategory.MERCHANT_PAYMENT,
                EndpointCategory.EXTERNAL_BANK,
                EndpointCategory.WALLET_TRANSFER,
                EndpointCategory.CROSS_BORDER,
            ]:
                terminal_offramp_amt += attr
            else:
                other_endpoints_amt += attr

            endpoint_details.append({
                "category": ep.category.value,
                "amount": float(attr),
                "account_id": str(ep.account_id),
                "reason": ep.reason,
            })

        all_lots = db.query(FundLot).filter(FundLot.origin_id == origin.id).all()
        reversed_lots = [lot for lot in all_lots if lot.status == LotStatus.REVERSED]
        total_reversed = sum((lot.attributed_amount for lot in reversed_lots), Decimal("0.00"))

        # Leaf lots that are active but not associated with an endpoint yet
        endpoint_lot_ids = {ep.lot_id for ep in endpoints}
        unresolved_active = sum(
            (lot.remaining_amount for lot in all_lots if lot.id not in endpoint_lot_ids and lot.status in [LotStatus.ACTIVE, LotStatus.SPLIT]),
            Decimal("0.00"),
        )

        total_accounted = quantize_amount(terminal_offramp_amt + retained_amt + other_endpoints_amt + total_reversed + unresolved_active)
        origin_amount = quantize_amount(origin.origin_amount)
        discrepancy = quantize_amount(abs(origin_amount - total_accounted))
        is_balanced = discrepancy <= Decimal("0.01")

        return {
            "origin_ref": origin.origin_ref,
            "origin_amount": origin_amount,
            "terminal_offramps": terminal_offramp_amt,
            "retained_balance": retained_amt,
            "total_endpoints": terminal_offramp_amt + retained_amt + other_endpoints_amt,
            "total_reversed": total_reversed,
            "unresolved_active": unresolved_active,
            "total_accounted": total_accounted,
            "discrepancy": discrepancy,
            "is_balanced": is_balanced,
            "details": endpoint_details,
        }
