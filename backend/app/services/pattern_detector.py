"""Synthetic behavioral pattern detector for mule typologies.

Implements the 5 explainable patterns from the specification:
1. Rapid pass-through
2. Fan-in
3. Fan-out
4. Layering chain
5. Circular / return flow
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Set, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.account import Account, AccountType
from app.models.transaction import Transaction, TransactionStatus


class PatternDetector:
    @staticmethod
    def detect_rapid_passthrough(
        account: Account,
        transactions: List[Transaction],
        max_delay_hours: float = 24.0,
        min_passthrough_ratio: float = 0.70,
    ) -> Dict[str, Any]:
        """Pattern 1: Rapid pass-through

        Account receives funds and transfers a large portion shortly afterward.
        Pass-through ratio = Relevant outgoing amount / Incoming amount
        """
        incoming = sorted(
            [tx for tx in transactions if tx.receiver_account_id == account.id and tx.status == TransactionStatus.POSTED],
            key=lambda x: x.timestamp,
        )
        outgoing = sorted(
            [tx for tx in transactions if tx.sender_account_id == account.id and tx.status == TransactionStatus.POSTED],
            key=lambda x: x.timestamp,
        )

        matches = []
        for in_tx in incoming:
            # Look for outgoing transactions within max_delay_hours after this incoming tx
            window_end = in_tx.timestamp + timedelta(hours=max_delay_hours)
            relevant_out = [
                out_tx for out_tx in outgoing
                if in_tx.timestamp <= out_tx.timestamp <= window_end
            ]
            if not relevant_out:
                continue

            total_out = sum((tx.amount for tx in relevant_out), Decimal("0.00"))
            if in_tx.amount > Decimal("0.00"):
                ratio = float(total_out / in_tx.amount)
                # First outgoing transaction delay
                first_out = min(relevant_out, key=lambda x: x.timestamp)
                delay_minutes = (first_out.timestamp - in_tx.timestamp).total_seconds() / 60.0

                if ratio >= min_passthrough_ratio:
                    matches.append({
                        "incoming_tx_ref": in_tx.transaction_ref,
                        "incoming_amount": float(in_tx.amount),
                        "incoming_time": in_tx.timestamp.isoformat(),
                        "outgoing_count": len(relevant_out),
                        "outgoing_total": float(total_out),
                        "passthrough_ratio": round(ratio, 4),
                        "delay_minutes": round(delay_minutes, 1),
                    })

        detected = len(matches) > 0
        return {
            "pattern_id": "PATTERN_1_RAPID_PASSTHROUGH",
            "name": "Rapid pass-through",
            "detected": detected,
            "score": min(1.0, 0.4 + 0.6 * max((m["passthrough_ratio"] for m in matches), default=0.0)) if detected else 0.0,
            "evidence": matches,
            "lookalike_risk": account.account_type in [AccountType.MERCHANT, AccountType.CURRENT],
            "description": "Account receives funds and forwards >= 70% within 24 hours.",
        }

    @staticmethod
    def detect_fan_in(
        account: Account,
        transactions: List[Transaction],
        min_counterparties: int = 3,
        window_hours: float = 48.0,
    ) -> Dict[str, Any]:
        """Pattern 2: Fan-in

        Many different accounts send funds into one account.
        """
        incoming = [
            tx for tx in transactions
            if tx.receiver_account_id == account.id and tx.status == TransactionStatus.POSTED
        ]

        senders: Set[UUID] = {tx.sender_account_id for tx in incoming}
        detected = len(senders) >= min_counterparties
        total_in = sum((tx.amount for tx in incoming), Decimal("0.00"))

        return {
            "pattern_id": "PATTERN_2_FAN_IN",
            "name": "Fan-in",
            "detected": detected,
            "score": min(1.0, len(senders) / 5.0) if detected else 0.0,
            "evidence": {
                "unique_incoming_counterparties": len(senders),
                "incoming_transaction_count": len(incoming),
                "total_incoming_amount": float(total_in),
            },
            "lookalike_risk": account.account_type == AccountType.MERCHANT,
            "description": f"Account received incoming funds from {len(senders)} distinct counterparties.",
        }

    @staticmethod
    def detect_fan_out(
        account: Account,
        transactions: List[Transaction],
        min_counterparties: int = 3,
        window_hours: float = 48.0,
    ) -> Dict[str, Any]:
        """Pattern 3: Fan-out

        One account distributes funds to many different accounts.
        """
        outgoing = [
            tx for tx in transactions
            if tx.sender_account_id == account.id and tx.status == TransactionStatus.POSTED
        ]

        receivers: Set[UUID] = {tx.receiver_account_id for tx in outgoing}
        detected = len(receivers) >= min_counterparties
        total_out = sum((tx.amount for tx in outgoing), Decimal("0.00"))

        return {
            "pattern_id": "PATTERN_3_FAN_OUT",
            "name": "Fan-out",
            "detected": detected,
            "score": min(1.0, len(receivers) / 5.0) if detected else 0.0,
            "evidence": {
                "unique_outgoing_counterparties": len(receivers),
                "outgoing_transaction_count": len(outgoing),
                "total_outgoing_amount": float(total_out),
            },
            "lookalike_risk": account.account_type == AccountType.CURRENT,  # e.g. payroll
            "description": f"Account distributed funds to {len(receivers)} distinct counterparties.",
        }

    @staticmethod
    def detect_layering(
        account: Account,
        hop_count: int,
        is_cross_bank: bool,
        retention_ratio: float,
    ) -> Dict[str, Any]:
        """Pattern 4: Layering chain

        Funds move through multiple intermediary accounts, especially cross-bank hops.
        """
        detected = hop_count >= 2 and retention_ratio < 0.30
        score = 0.0
        if detected:
            score = min(1.0, 0.4 + (0.2 * min(hop_count, 5)) + (0.2 if is_cross_bank else 0.0))

        return {
            "pattern_id": "PATTERN_4_LAYERING",
            "name": "Layering chain",
            "detected": detected,
            "score": score,
            "evidence": {
                "hop_count": hop_count,
                "is_cross_bank": is_cross_bank,
                "retention_ratio": round(retention_ratio, 4),
            },
            "lookalike_risk": False,
            "description": f"Intermediary in a {hop_count}-hop layering path with low retention ({round(retention_ratio*100, 1)}%).",
        }

    @staticmethod
    def detect_circular_flow(
        account: Account,
        cycle_paths: List[List[str]],
    ) -> Dict[str, Any]:
        """Pattern 5: Circular or return flow

        Funds move through several accounts and return to an earlier account.
        """
        relevant_cycles = [path for path in cycle_paths if account.pseudo_id in path]
        detected = len(relevant_cycles) > 0

        return {
            "pattern_id": "PATTERN_5_CIRCULAR_FLOW",
            "name": "Circular / return flow",
            "detected": detected,
            "score": 0.85 if detected else 0.0,
            "evidence": {
                "cycles_involved": relevant_cycles,
                "cycle_count": len(relevant_cycles),
            },
            "lookalike_risk": False,
            "description": f"Account participates in {len(relevant_cycles)} circular flow cycle(s).",
        }

    @classmethod
    def evaluate_account(
        cls,
        account: Account,
        all_transactions: List[Transaction],
        hop_count: int = 0,
        is_cross_bank: bool = False,
        retention_ratio: float = 1.0,
        cycle_paths: List[List[str]] = None,
    ) -> Dict[str, Any]:
        """Run all 5 synthetic pattern detectors on an account."""
        cycle_paths = cycle_paths or []
        p1 = cls.detect_rapid_passthrough(account, all_transactions)
        p2 = cls.detect_fan_in(account, all_transactions)
        p3 = cls.detect_fan_out(account, all_transactions)
        p4 = cls.detect_layering(account, hop_count, is_cross_bank, retention_ratio)
        p5 = cls.detect_circular_flow(account, cycle_paths)

        patterns = [p1, p2, p3, p4, p5]
        detected_patterns = [p["pattern_id"] for p in patterns if p["detected"]]

        # Overall behavioral score is maximum pattern score
        behavioral_score = max((p["score"] for p in patterns), default=0.0)

        return {
            "account_pseudo_id": account.pseudo_id,
            "behavioral_score": round(behavioral_score, 4),
            "patterns": patterns,
            "detected_pattern_ids": detected_patterns,
        }
