"""Audit event Pydantic schemas."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    result: str
    reason: Optional[str] = None
    timestamp: datetime
    ip_address: Optional[str] = None
