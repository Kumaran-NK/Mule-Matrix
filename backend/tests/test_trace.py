"""Tests for temporal trace engine, cycles, and endpoint classification."""

from decimal import Decimal
import pytest
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.endpoint import EndpointCategory
from app.models.trace_run import AllocationPolicy, TraceStatus
from app.services.provenance_engine import ProvenanceEngine
from app.services.trace_engine import TraceEngine


def test_full_trace_execution(db: Session):
    """Test full multi-hop forward trace execution on main demo case."""
    case = db.query(Case).filter(Case.case_ref == "CASE-2026-001").first()
    origin = case.origins[0]

    trace_run = TraceEngine.execute_trace(
        db=db,
        case=case,
        origin=origin,
        policy=AllocationPolicy.FIFO,
    )

    assert trace_run.status == TraceStatus.COMPLETED
    assert trace_run.total_endpoints == 4
    assert trace_run.total_accounts_discovered >= 5

    # Check observed endpoints
    endpoint_categories = {ep.category for ep in trace_run.endpoints}
    assert EndpointCategory.ATM_WITHDRAWAL in endpoint_categories
    assert EndpointCategory.MERCHANT_PAYMENT in endpoint_categories
    assert EndpointCategory.EXTERNAL_BANK in endpoint_categories
    assert EndpointCategory.RETAINED_BALANCE in endpoint_categories

    # Verify 100% amount reconciliation
    recon = ProvenanceEngine.reconcile_origin(db, origin)
    assert recon["is_balanced"] is True
    assert recon["discrepancy"] == Decimal("0.00")
    assert recon["total_accounted"] == Decimal("100000.00")
    assert recon["terminal_offramps"] == Decimal("95000.00")
    assert recon["retained_balance"] == Decimal("5000.00")


def test_cycles_detected_safely(db: Session):
    """Test that circular flows (T09) are detected and terminate safely."""
    case = db.query(Case).filter(Case.case_ref == "CASE-2026-001").first()
    origin = case.origins[0]

    trace_run = TraceEngine.execute_trace(db=db, case=case, origin=origin)
    # The synthetic dataset contains a 3-node cycle (A->B->C->A)
    assert trace_run.cycles_detected >= 1
