"""Audit service — records tamper-evident activity logs."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent


class AuditService:
    @staticmethod
    def log(
        db: Session,
        actor: str,
        action: str,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        result: str = "SUCCESS",
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditEvent:
        """Create and persist an audit event."""
        event = AuditEvent(
            actor=actor,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            details=details,
            result=result,
            reason=reason,
            timestamp=datetime.now(timezone.utc),
            ip_address=ip_address,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def list_events(
        db: Session,
        limit: int = 100,
        offset: int = 0,
        action: Optional[str] = None,
        actor: Optional[str] = None,
    ) -> list[AuditEvent]:
        """Query audit log events."""
        query = db.query(AuditEvent)
        if action:
            query = query.filter(AuditEvent.action == action)
        if actor:
            query = query.filter(AuditEvent.actor == actor)
        return query.order_by(AuditEvent.timestamp.desc()).offset(offset).limit(limit).all()
