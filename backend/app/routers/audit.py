"""Audit API router — queries immutable audit logs."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditEvent
from app.schemas.audit import AuditEventResponse
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("", response_model=List[AuditEventResponse])
def list_audit_events(
    action: Optional[str] = None,
    actor: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Query tamper-evident activity audit events."""
    events = AuditService.list_events(db, limit=limit, offset=offset, action=action, actor=actor)
    return events
