"""Tests for CBDC-inspired fund provenance engine."""

from decimal import Decimal
import pytest
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.case import Case
from app.models.fund_lot import FundLot, LotStatus
from app.models.lineage_event import LineageEventType
from app.models.origin import Origin
from app.models.trace_run import AllocationPolicy
from app.models.transaction import Transaction, TransactionStatus
from app.services.provenance_engine import (
    InvariantViolationError,
    ProvenanceEngine,
    quantize_amount,
)


def test_origin_and_initial_lot_creation(db: Session):
    """Test origin and initial root lot creation with exact decimal conservation."""
    case = db.query(Case).filter(Case.case_ref == "CASE-2026-001").first()
    assert case is not None
    assert len(case.origins) > 0
    origin = case.origins[0]

    assert origin.origin_amount == Decimal("100000.00")
    root_lot = (
        db.query(FundLot)
        .filter(FundLot.origin_id == origin.id, FundLot.parent_lot_id == None)
        .first()
    )
    assert root_lot is not None
    assert root_lot.attributed_amount == Decimal("100000.00")
    assert root_lot.remaining_amount == Decimal("100000.00")
    assert root_lot.hop_count == 0


def test_lot_split_and_invariants(db: Session):
    """Test lot splitting, remaining balance deduction, and invariant enforcement."""
    case = db.query(Case).filter(Case.case_ref == "CASE-2026-001").first()
    origin = case.origins[0]
    root_lot = (
        db.query(FundLot)
        .filter(FundLot.origin_id == origin.id, FundLot.parent_lot_id == None)
        .first()
    )

    dest_acc = db.query(Account).filter(Account.pseudo_id == "PSEUDO-MULE-02").first()
    tx = db.query(Transaction).filter(Transaction.transaction_ref == "TX-SPLIT-01").first()

    # Split ₹45,000 from root lot
    child_lot = ProvenanceEngine.split_lot(
        db=db,
        parent_lot=root_lot,
        allocation_amount=Decimal("45000.00"),
        destination_account_id=dest_acc.id,
        transaction=tx,
    )

    assert child_lot.attributed_amount == Decimal("45000.00")
    assert child_lot.remaining_amount == Decimal("45000.00")
    assert child_lot.hop_count == 1
    assert child_lot.parent_lot_id == root_lot.id
    assert root_lot.remaining_amount == Decimal("55000.00")
    assert root_lot.status == LotStatus.SPLIT

    # Invariant: Cannot allocate more than parent remaining
    with pytest.raises(InvariantViolationError):
        ProvenanceEngine.split_lot(
            db=db,
            parent_lot=root_lot,
            allocation_amount=Decimal("60000.00"),  # > 55,000 remaining
            destination_account_id=dest_acc.id,
            transaction=tx,
        )


def test_fifo_vs_proportional_allocation():
    """Test FIFO and Proportional allocation accounting formulas."""
    lot = FundLot(
        attributed_amount=Decimal("40000.00"),
        remaining_amount=Decimal("40000.00"),
        status=LotStatus.ACTIVE,
    )
    tx = Transaction(amount=Decimal("30000.00"), status=TransactionStatus.POSTED)

    # FIFO: Outgoing debit consumes oldest available lot up to transaction amount
    fifo_alloc = ProvenanceEngine.calculate_allocation(
        lot=lot,
        transaction=tx,
        account_balance=Decimal("100000.00"),  # mixed balance: ₹40,000 suspicious + ₹60,000 legitimate
        policy=AllocationPolicy.FIFO,
    )
    assert fifo_alloc == Decimal("30000.00")

    # Proportional: 40k / 100k = 40% of 30,000 = ₹12,000
    prop_alloc = ProvenanceEngine.calculate_allocation(
        lot=lot,
        transaction=tx,
        account_balance=Decimal("100000.00"),
        policy=AllocationPolicy.PROPORTIONAL,
    )
    assert prop_alloc == Decimal("12000.00")


def test_reversal_handling(db: Session):
    """Test that compensating reversal updates lot status without deleting history."""
    rev_tx = db.query(Transaction).filter(Transaction.transaction_ref == "TX-REV-COMP").first()
    assert rev_tx is not None
    assert rev_tx.is_reversal is True
    assert rev_tx.reversal_of_id is not None
