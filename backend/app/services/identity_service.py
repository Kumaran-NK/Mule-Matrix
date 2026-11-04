"""Identity service — bank-controlled pseudonymous identity resolution workflow.

Enforces privacy: real identity mappings are stored separately from investigation views.
Disclosure requires purpose-bound justification, reviewer approval, and least-privilege disclosure.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.case import Case
from app.models.identity import IdentityMapping, IdentityRequest, RequestStatus
from app.services.audit_service import AuditService


class IdentityService:
    @staticmethod
    def create_request(
        db: Session,
        case_id: UUID,
        account_id: UUID,
        requested_by: str,
        justification: str,
    ) -> IdentityRequest:
        """Submit a purpose-bound identity resolution request."""
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            raise ValueError(f"Account {account_id} not found.")

        req = IdentityRequest(
            case_id=case_id,
            account_id=account_id,
            requested_by=requested_by,
            justification=justification,
            status=RequestStatus.PENDING,
            requested_at=datetime.now(timezone.utc),
        )
        db.add(req)
        db.commit()
        db.refresh(req)

        AuditService.log(
            db=db,
            actor=requested_by,
            action="IDENTITY_REQUEST_SUBMITTED",
            target_type="identity_request",
            target_id=str(req.id),
            details={
                "case_id": str(case_id),
                "account_pseudo_id": account.pseudo_id,
                "justification": justification,
            },
        )
        return req

    @staticmethod
    def review_request(
        db: Session,
        request_id: UUID,
        reviewer: str,
        status: RequestStatus,
        review_notes: Optional[str] = None,
        disclosed_fields: Optional[List[str]] = None,
    ) -> IdentityRequest:
        """Approve or reject an identity resolution request (Reviewer/Bank Compliance role)."""
        req = db.query(IdentityRequest).filter(IdentityRequest.id == request_id).first()
        if not req:
            raise ValueError("Identity request not found.")

        req.status = status
        req.reviewed_by = reviewer
        req.review_notes = review_notes
        req.reviewed_at = datetime.now(timezone.utc)

        if status == RequestStatus.APPROVED:
            req.disclosed_fields = disclosed_fields or ["real_name", "phone", "real_account_number"]
        else:
            req.disclosed_fields = None

        db.commit()
        db.refresh(req)

        AuditService.log(
            db=db,
            actor=reviewer,
            action=f"IDENTITY_REQUEST_{status.value}",
            target_type="identity_request",
            target_id=str(req.id),
            result="SUCCESS" if status == RequestStatus.APPROVED else "DENIED",
            reason=review_notes,
            details={
                "request_id": str(req.id),
                "disclosed_fields": req.disclosed_fields,
            },
        )
        return req

    @staticmethod
    def get_disclosed_identity(
        db: Session,
        request_id: UUID,
        actor: str = "investigator",
    ) -> Optional[Dict[str, Any]]:
        """Retrieve permitted identity fields ONLY if the request is APPROVED."""
        req = db.query(IdentityRequest).filter(IdentityRequest.id == request_id).first()
        if not req:
            raise ValueError("Identity request not found.")

        if req.status != RequestStatus.APPROVED:
            AuditService.log(
                db=db,
                actor=actor,
                action="IDENTITY_DISCLOSURE_ACCESS_DENIED",
                target_type="identity_request",
                target_id=str(req.id),
                result="DENIED",
                reason=f"Attempted to access identity on {req.status.value} request.",
            )
            return None

        # Fetch bank-side identity mapping
        mapping = (
            db.query(IdentityMapping)
            .filter(IdentityMapping.account_id == req.account_id)
            .first()
        )
        if not mapping:
            return None

        allowed = set(req.disclosed_fields or [])
        full_data = {
            "real_name": mapping.real_name,
            "real_account_number": mapping.real_account_number,
            "bank_branch": mapping.bank_branch,
            "phone": mapping.phone,
            "email": mapping.email,
            "address": mapping.address,
            "id_type": mapping.id_type,
            "id_number": mapping.id_number,
        }

        # Filter strictly by least privilege
        filtered_disclosure = {k: v for k, v in full_data.items() if k in allowed}

        AuditService.log(
            db=db,
            actor=actor,
            action="IDENTITY_DISCLOSURE_ACCESSED",
            target_type="identity_request",
            target_id=str(req.id),
            details={"disclosed_keys": list(filtered_disclosure.keys())},
        )
        return filtered_disclosure

    @staticmethod
    def list_requests(
        db: Session,
        case_id: Optional[UUID] = None,
        status: Optional[RequestStatus] = None,
    ) -> List[IdentityRequest]:
        """List identity resolution requests."""
        query = db.query(IdentityRequest)
        if case_id:
            query = query.filter(IdentityRequest.case_id == case_id)
        if status:
            query = query.filter(IdentityRequest.status == status)
        return query.order_by(IdentityRequest.requested_at.desc()).all()
