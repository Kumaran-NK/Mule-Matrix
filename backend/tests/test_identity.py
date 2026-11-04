"""Tests for privacy model, pseudonyms, and identity resolution workflow."""

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.case import Case
from app.models.identity import IdentityRequest, RequestStatus
from app.services.identity_service import IdentityService


def test_identity_request_workflow(db: Session):
    """Test identity request submission, reviewer approval, and least-privilege disclosure."""
    case = db.query(Case).filter(Case.case_ref == "CASE-2026-001").first()
    mule = db.query(Account).filter(Account.pseudo_id == "PSEUDO-MULE-01").first()

    # Step 1: Investigator submits purpose-bound request
    req = IdentityService.create_request(
        db=db,
        case_id=case.id,
        account_id=mule.id,
        requested_by="investigator_lead",
        justification="High-confidence primary mule identified handling ₹1,00,000 victim transfer.",
    )

    assert req.status == RequestStatus.PENDING
    assert req.reviewed_by is None

    # Step 2: Unauthorized / pending access returns None
    disclosed_pending = IdentityService.get_disclosed_identity(db, req.id)
    assert disclosed_pending is None

    # Step 3: Reviewer approves with specific permitted fields
    approved_req = IdentityService.review_request(
        db=db,
        request_id=req.id,
        reviewer="bank_officer_compliance",
        status=RequestStatus.APPROVED,
        review_notes="Authorized by court order Ref 2026/MM/991.",
        disclosed_fields=["real_name", "phone"],
    )

    assert approved_req.status == RequestStatus.APPROVED

    # Step 4: Disclosed payload contains ONLY permitted fields (least-privilege)
    disclosed_data = IdentityService.get_disclosed_identity(db, req.id)
    assert disclosed_data is not None
    assert "real_name" in disclosed_data
    assert "phone" in disclosed_data
    assert "real_account_number" not in disclosed_data  # omitted per approval


def test_identity_request_rejection(db: Session):
    """Test identity request rejection."""
    case = db.query(Case).filter(Case.case_ref == "CASE-2026-001").first()
    merch = db.query(Account).filter(Account.pseudo_id == "PSEUDO-MERCH-01").first()

    req = IdentityService.create_request(
        db=db,
        case_id=case.id,
        account_id=merch.id,
        requested_by="investigator_lead",
        justification="Requesting merchant identity.",
    )

    rejected_req = IdentityService.review_request(
        db=db,
        request_id=req.id,
        reviewer="bank_compliance",
        status=RequestStatus.REJECTED,
        review_notes="Insufficient evidence; merchant account has normal transaction profile.",
    )

    assert rejected_req.status == RequestStatus.REJECTED
    assert IdentityService.get_disclosed_identity(db, req.id) is None
