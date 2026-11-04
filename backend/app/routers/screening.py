"""Behavioral Screening API router — simulates upstream 5-typology mule screening."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account, AccountType
from app.models.transaction import Transaction, TransactionStatus
from app.services.graph_engine import GraphEngine
from app.services.pattern_detector import PatternDetector

router = APIRouter()


@router.get("/candidates")
def get_screening_candidates(db: Session = Depends(get_db)):
    """Run the 5 synthetic pattern typologies across accounts to surface candidates."""
    all_accounts = db.query(Account).all()
    all_txs = db.query(Transaction).all()

    G = GraphEngine.build_transaction_graph(all_accounts, all_txs)
    cycles = GraphEngine.detect_cycles(G)

    candidates = []
    pattern_counts = {
        "PATTERN_1_RAPID_PASSTHROUGH": 0,
        "PATTERN_2_FAN_IN": 0,
        "PATTERN_3_FAN_OUT": 0,
        "PATTERN_4_LAYERING": 0,
        "PATTERN_5_CIRCULAR_FLOW": 0,
    }

    for acc in all_accounts:
        eval_res = PatternDetector.evaluate_account(
            account=acc,
            all_transactions=all_txs,
            hop_count=2 if "MULE-02" in acc.pseudo_id else (3 if "MULE-03" in acc.pseudo_id else 0),
            is_cross_bank=True,
            cycle_paths=cycles,
        )

        detected_ids = eval_res["detected_pattern_ids"]
        if detected_ids:
            for pid in detected_ids:
                if pid in pattern_counts:
                    pattern_counts[pid] += 1

            # Candidate incoming/outgoing transactions that can serve as seeds
            related_txs = [
                {
                    "id": str(tx.id),
                    "transaction_ref": tx.transaction_ref,
                    "amount": float(tx.amount),
                    "timestamp": tx.timestamp.isoformat(),
                    "sender_pseudo_id": tx.sender_account.pseudo_id if tx.sender_account else "N/A",
                    "receiver_pseudo_id": tx.receiver_account.pseudo_id if tx.receiver_account else "N/A",
                    "channel": tx.channel.value,
                }
                for tx in all_txs
                if (tx.receiver_account_id == acc.id or tx.sender_account_id == acc.id)
                and tx.status == TransactionStatus.POSTED
            ][:5]

            candidates.append({
                "account_id": str(acc.id),
                "pseudo_id": acc.pseudo_id,
                "bank_code": acc.bank.code if acc.bank else "UNKNOWN",
                "bank_name": acc.bank.name if acc.bank else "Unknown Bank",
                "account_type": acc.account_type.value,
                "current_balance": float(acc.current_balance),
                "behavioral_score": eval_res["behavioral_score"],
                "detected_patterns": detected_ids,
                "pattern_details": eval_res["patterns"],
                "potential_seeds": related_txs,
            })

    # Sort by behavioral score descending
    candidates.sort(key=lambda x: x["behavioral_score"], reverse=True)

    return {
        "total_screened_accounts": len(all_accounts),
        "total_flagged_candidates": len(candidates),
        "pattern_breakdown": pattern_counts,
        "candidates": candidates,
    }
