"""Account and network assessment service.

Computes explainable, deterministic suspicion scores and categories.
Separates fund attribution from account suspicion:
A recipient of suspicious funds is NOT automatically classified as a mule.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.account import Account, AccountType
from app.models.assessment import AccountAssessment, AssessmentCategory
from app.models.fund_lot import FundLot
from app.models.trace_run import TraceRun
from app.models.transaction import Transaction, TransactionStatus
from app.services.pattern_detector import PatternDetector


class AssessmentService:
    @staticmethod
    def assess_account(
        account: Account,
        attributed_amount: Decimal,
        all_transactions: List[Transaction],
        is_seed_account: bool = False,
        hop_count: int = 0,
        is_cross_bank: bool = False,
        cycle_paths: List[List[str]] = None,
    ) -> Dict[str, Any]:
        """Compute deterministic, explainable assessment for an account."""
        # Rule 1: Special classification for merchants
        if account.account_type == AccountType.MERCHANT:
            return {
                "category": AssessmentCategory.MERCHANT,
                "confidence_score": 0.90,
                "behavioral_score": 0.05,
                "temporal_score": 0.05,
                "graph_score": 0.05,
                "fund_score": 0.10,
                "relationship_score": 0.05,
                "evidence": [
                    {
                        "dimension": "ACCOUNT_TYPE",
                        "summary": "Verified merchant account. Receiving payment is standard business activity.",
                        "detail": f"Account type: {account.account_type.value}, Bank: {account.bank.name if account.bank else 'N/A'}",
                    }
                ],
                "patterns_detected": [],
                "reason": "Merchant counterparty receiving consumer funds; not classified as a mule.",
            }

        # Rule 2: Seed account (victim / initiator)
        if is_seed_account:
            return {
                "category": AssessmentCategory.SEED_ACCOUNT,
                "confidence_score": 0.95,
                "behavioral_score": 0.0,
                "temporal_score": 0.0,
                "graph_score": 0.0,
                "fund_score": 0.0,
                "relationship_score": 0.0,
                "evidence": [
                    {
                        "dimension": "ORIGIN",
                        "summary": "Complaint originator / victim seed account.",
                        "detail": "Initiated the reported seed transaction.",
                    }
                ],
                "patterns_detected": [],
                "reason": "Seed account where the reported transfer originated.",
            }

        # Rule 3: Behavioral pattern detection
        eval_result = PatternDetector.evaluate_account(
            account=account,
            all_transactions=all_transactions,
            hop_count=hop_count,
            is_cross_bank=is_cross_bank,
            retention_ratio=0.10 if hop_count >= 1 else 1.0,
            cycle_paths=cycle_paths,
        )
        behavioral_score = eval_result["behavioral_score"]
        patterns_detected = eval_result["detected_pattern_ids"]

        # Temporal score: based on velocity and pass-through speed
        temporal_score = 0.0
        p1 = next((p for p in eval_result["patterns"] if p["pattern_id"] == "PATTERN_1_RAPID_PASSTHROUGH"), None)
        if p1 and p1["detected"]:
            temporal_score = min(1.0, p1["score"])

        # Graph score: fan-in, fan-out, layering, cycles
        graph_components = []
        p2 = next((p for p in eval_result["patterns"] if p["pattern_id"] == "PATTERN_2_FAN_IN"), None)
        p3 = next((p for p in eval_result["patterns"] if p["pattern_id"] == "PATTERN_3_FAN_OUT"), None)
        p4 = next((p for p in eval_result["patterns"] if p["pattern_id"] == "PATTERN_4_LAYERING"), None)
        p5 = next((p for p in eval_result["patterns"] if p["pattern_id"] == "PATTERN_5_CIRCULAR_FLOW"), None)

        if p2 and p2["detected"]:
            graph_components.append(p2["score"])
        if p3 and p3["detected"]:
            graph_components.append(p3["score"])
        if p4 and p4["detected"]:
            graph_components.append(p4["score"])
        if p5 and p5["detected"]:
            graph_components.append(p5["score"])

        graph_score = max(graph_components) if graph_components else 0.0

        # Fund score: attributed amount exposure
        fund_score = 0.0
        if attributed_amount > Decimal("0.00"):
            # Normalize between 0.1 and 1.0 depending on exposure
            if attributed_amount >= Decimal("50000.00"):
                fund_score = 0.80
            elif attributed_amount >= Decimal("10000.00"):
                fund_score = 0.50
            else:
                fund_score = 0.25

        # Relationship score: cross-bank jumps, unknown counterparties
        relationship_score = 0.60 if is_cross_bank else 0.20

        # Composite Evidence Score
        composite_score = round(
            (0.30 * behavioral_score)
            + (0.20 * temporal_score)
            + (0.20 * graph_score)
            + (0.15 * fund_score)
            + (0.15 * relationship_score),
            4,
        )

        evidence_items = []
        for p in eval_result["patterns"]:
            if p["detected"]:
                evidence_items.append({
                    "dimension": "BEHAVIORAL",
                    "pattern": p["name"],
                    "summary": p["description"],
                    "score": p["score"],
                })

        if is_cross_bank:
            evidence_items.append({
                "dimension": "NETWORK",
                "summary": "Cross-bank intermediary hop observed.",
                "score": 0.60,
            })

        evidence_items.append({
            "dimension": "FUND_PROVENANCE",
            "summary": f"Estimated attributed suspicious value: ₹{attributed_amount:,.2f}",
            "score": fund_score,
        })

        # Category determination
        if composite_score >= 0.55 and (len(patterns_detected) > 0 or temporal_score >= 0.60):
            category = AssessmentCategory.LIKELY_MULE
            reason = "High behavioral and graph suspicion consistent with mule network activity."
        elif composite_score < 0.38 and len(patterns_detected) == 0:
            category = AssessmentCategory.LEGITIMATE_COUNTERPARTY
            reason = "Low suspicion score and ordinary counterparty behavior despite fund exposure."
        else:
            category = AssessmentCategory.UNRESOLVED
            reason = "Ambiguous signals requiring further bank-level or identity verification."

        return {
            "category": category,
            "confidence_score": composite_score,
            "behavioral_score": round(behavioral_score, 4),
            "temporal_score": round(temporal_score, 4),
            "graph_score": round(graph_score, 4),
            "fund_score": round(fund_score, 4),
            "relationship_score": round(relationship_score, 4),
            "evidence": evidence_items,
            "patterns_detected": patterns_detected,
            "reason": reason,
        }

    @staticmethod
    def persist_assessments(
        db: Session,
        trace_run: TraceRun,
        assessments_data: List[Dict[str, Any]],
    ) -> List[AccountAssessment]:
        """Save account assessments to the database."""
        records = []
        for item in assessments_data:
            rec = AccountAssessment(
                trace_run_id=trace_run.id,
                account_id=item["account_id"],
                category=item["category"],
                confidence_score=item["confidence_score"],
                behavioral_score=item["behavioral_score"],
                temporal_score=item["temporal_score"],
                graph_score=item["graph_score"],
                fund_score=item["fund_score"],
                relationship_score=item["relationship_score"],
                evidence=item["evidence"],
                attributed_amount=item["attributed_amount"],
                attributed_fraction=item.get("attributed_fraction", 0.0),
                patterns_detected=item["patterns_detected"],
            )
            db.add(rec)
            records.append(rec)

        db.commit()
        return records
