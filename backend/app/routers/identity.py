"""Identity API router — bank-controlled identity resolution workflow."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.identity import IdentityRequest, RequestStatus
from app.schemas.identity import (
    IdentityRequestCreate,
    IdentityRequestResponse,
    IdentityReview,
)
from app.services.identity_service import IdentityService

router = APIRouter()


def _to_request_response(req: IdentityRequest, db: Session) -> IdentityRequestResponse:
    disclosed_data = None
    if req.status == RequestStatus.APPROVED:
        disclosed_data = IdentityService.get_disclosed_identity(db, req.id, actor=req.requested_by)

    acc = req.account
    return IdentityRequestResponse(
        id=req.id,
        case_id=req.case_id,
        account_id=req.account_id,
        account_pseudo_id=acc.pseudo_id if acc else None,
        requested_by=req.requested_by,
        justification=req.justification,
        status=req.status,
        reviewed_by=req.reviewed_by,
        review_notes=req.review_notes,
        disclosed_fields=req.disclosed_fields,
        requested_at=req.requested_at,
        reviewed_at=req.reviewed_at,
        disclosed_data=disclosed_data,
    )


@router.get("/requests", response_model=List[IdentityRequestResponse])
def list_identity_requests(
    case_id: Optional[UUID] = None,
    status: Optional[RequestStatus] = None,
    db: Session = Depends(get_db),
):
    """List identity resolution requests with approval status."""
    requests = IdentityService.list_requests(db, case_id=case_id, status=status)
    return [_to_request_response(r, db) for r in requests]


@router.post("/requests", response_model=IdentityRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_identity_request(
    payload: IdentityRequestCreate,
    db: Session = Depends(get_db),
):
    """Submit a purpose-bound identity resolution request."""
    account_id = payload.account_id
    if not account_id and payload.account_pseudo_id:
        acc = db.query(Account).filter(Account.pseudo_id == payload.account_pseudo_id).first()
        if not acc:
            raise HTTPException(status_code=404, detail=f"Account '{payload.account_pseudo_id}' not found.")
        account_id = acc.id

    if not account_id:
        raise HTTPException(status_code=400, detail="Account ID or pseudo ID required.")

    req = IdentityService.create_request(
        db=db,
        case_id=payload.case_id,
        account_id=account_id,
        requested_by=payload.requested_by,
        justification=payload.justification,
    )
    return _to_request_response(req, db)


@router.get("/requests/{request_id}", response_model=IdentityRequestResponse)
def get_identity_request(
    request_id: UUID,
    db: Session = Depends(get_db),
):
    """Get single identity request and disclosed identity payload if approved."""
    req = db.query(IdentityRequest).filter(IdentityRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Identity request not found.")
    return _to_request_response(req, db)


@router.put("/requests/{request_id}/review", response_model=IdentityRequestResponse)
def review_identity_request(
    request_id: UUID,
    payload: IdentityReview,
    db: Session = Depends(get_db),
):
    """Approve or reject identity disclosure request (Reviewer / Bank Officer role)."""
    req = db.query(IdentityRequest).filter(IdentityRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Identity request not found.")

    updated_req = IdentityService.review_request(
        db=db,
        request_id=request_id,
        reviewer=payload.reviewed_by,
        status=payload.status,
        review_notes=payload.review_notes,
        disclosed_fields=payload.disclosed_fields,
    )
    return _to_request_response(updated_req, db)
