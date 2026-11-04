"""Tests for account assessment and evidence scoring."""

from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.account import Account, AccountType
from app.models.assessment import AssessmentCategory
from app.models.transaction import Transaction
from app.services.assessment_service import AssessmentService


def test_merchant_not_classified_as_mule(db: Session):
    """Crucial requirement: Merchant receiving funds must NOT be classified as a mule."""
    merch_acc = db.query(Account).filter(Account.pseudo_id == "PSEUDO-MERCH-01").first()
    all_txs = db.query(Transaction).all()

    assessment = AssessmentService.assess_account(
        account=merch_acc,
        attributed_amount=Decimal("35000.00"),
        all_transactions=all_txs,
    )

    assert assessment["category"] == AssessmentCategory.MERCHANT
    assert assessment["category"] != AssessmentCategory.LIKELY_MULE


def test_mule_classified_as_likely_mule(db: Session):
    """Test that primary mule with high pass-through and rapid movement is LIKELY_MULE."""
    mule_acc = db.query(Account).filter(Account.pseudo_id == "PSEUDO-MULE-01").first()
    all_txs = db.query(Transaction).all()

    assessment = AssessmentService.assess_account(
        account=mule_acc,
        attributed_amount=Decimal("100000.00"),
        all_transactions=all_txs,
        hop_count=0,
        is_cross_bank=True,
    )

    assert assessment["category"] == AssessmentCategory.LIKELY_MULE
    assert assessment["confidence_score"] >= 0.55
    assert len(assessment["evidence"]) > 0


def test_seed_account_classified_as_seed(db: Session):
    """Test that complainant/victim account is classified as SEED_ACCOUNT."""
    vic_acc = db.query(Account).filter(Account.pseudo_id == "PSEUDO-VIC-01").first()
    all_txs = db.query(Transaction).all()

    assessment = AssessmentService.assess_account(
        account=vic_acc,
        attributed_amount=Decimal("0.00"),
        all_transactions=all_txs,
        is_seed_account=True,
    )

    assert assessment["category"] == AssessmentCategory.SEED_ACCOUNT
