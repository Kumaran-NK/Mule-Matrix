"""Integration tests for all API endpoints."""

from decimal import Decimal
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.identity import RequestStatus
from app.routers.accounts import list_accounts, get_account
from app.routers.audit import list_audit_events
from app.routers.banks import list_banks
from app.routers.cases import (
    get_case,
    get_case_assessments,
    get_case_endpoints,
    get_case_graph,
    get_case_reconciliation,
    list_cases,
    run_case_trace,
)
from app.routers.identity import (
    get_identity_request,
    list_identity_requests,
    review_identity_request,
    submit_identity_request,
)
from app.routers.screening import get_screening_candidates
from app.routers.transactions import list_transactions
from app.schemas.identity import IdentityRequestCreate, IdentityReview
from app.schemas.trace import TraceRequest


def test_health_check_function():
    """Test health check route."""
    from app.main import health_check
    res = health_check()
    assert res["status"] == "healthy"
    assert res["service"] == "mule-matrix-api"


def test_list_banks_endpoint(db: Session):
    """Test GET /api/banks route function."""
    banks = list_banks(db=db)
    assert len(banks) >= 6
    codes = {b.code for b in banks}
    assert "APEX" in codes
    assert "GLOB" in codes


def test_list_accounts_endpoint(db: Session):
    """Test GET /api/accounts route function - verifies privacy / pseudonymous exposure."""
    accounts = list_accounts(db=db)
    assert len(accounts) >= 15
    for acc in accounts:
        assert hasattr(acc, "pseudo_id")
        # Ensure clear identity fields are not present on pseudonymous account response
        assert not hasattr(acc, "real_name")
        assert not hasattr(acc, "phone")


def test_case_lifecycle_endpoints(db: Session):
    """Test complete case workflow endpoints: list, get, trace, graph, assessments, reconciliation."""
    # 1. List cases
    cases = list_cases(db=db)
    assert len(cases) > 0
    case_id = cases[0].id

    # 2. Get case
    case = get_case(str(case_id), db=db)
    assert case.case_ref == "CASE-2026-001"

    # 3. Run trace on case
    trace_req = TraceRequest(allocation_policy="FIFO", direction="FORWARD", max_hops=10)
    trace_run = run_case_trace(case_id=case_id, payload=trace_req, db=db)
    assert trace_run.status.value == "COMPLETED"

    # 4. Get graph data (for React Flow)
    graph = get_case_graph(case_id=case_id, db=db)
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) >= 5
    assert len(graph["edges"]) >= 4

    # 5. Get endpoints
    endpoints = get_case_endpoints(case_id=case_id, db=db)
    assert len(endpoints) >= 4

    # 6. Get assessments
    assessments = get_case_assessments(case_id=case_id, db=db)
    assert len(assessments) >= 5

    # 7. Get reconciliation
    recon = get_case_reconciliation(case_id=case_id, db=db)
    assert recon.is_balanced is True
    assert recon.discrepancy == Decimal("0.00")
    assert recon.origin_amount == Decimal("100000.00")


def test_screening_candidates_endpoint(db: Session):
    """Test GET /api/screening/candidates returns candidates from 5 typologies."""
    data = get_screening_candidates(db=db)
    assert data["total_flagged_candidates"] > 0
    assert "pattern_breakdown" in data
    assert len(data["candidates"]) > 0


def test_identity_workflow_endpoints(db: Session):
    """Test identity request submission, review, and disclosure via endpoint functions."""
    cases = list_cases(db=db)
    case_id = cases[0].id

    # Submit request
    req_payload = IdentityRequestCreate(
        case_id=case_id,
        account_pseudo_id="PSEUDO-MULE-01",
        requested_by="investigator_lead",
        justification="Verified primary mule in ₹1,00,000 fraud ring.",
    )
    req = submit_identity_request(payload=req_payload, db=db)
    assert req.status == RequestStatus.PENDING
    assert req.disclosed_data is None

    # Review request (Approve)
    review_payload = IdentityReview(
        status=RequestStatus.APPROVED,
        reviewed_by="bank_compliance_officer",
        review_notes="Approved per section 10 compliance mandate.",
        disclosed_fields=["real_name", "phone"],
    )
    approved = review_identity_request(request_id=req.id, payload=review_payload, db=db)
    assert approved.status == RequestStatus.APPROVED
    assert approved.disclosed_data is not None
    assert "real_name" in approved.disclosed_data
    assert "phone" in approved.disclosed_data
    assert "real_account_number" not in approved.disclosed_data


def test_audit_events_endpoint(db: Session):
    """Test GET /api/audit endpoint."""
    from app.services.audit_service import AuditService
    AuditService.log(db=db, actor="auditor", action="SYSTEM_INSPECTION")
    events = list_audit_events(db=db)
    assert len(events) > 0
