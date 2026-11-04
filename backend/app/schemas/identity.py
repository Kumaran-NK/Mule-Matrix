"""Identity request and resolution Pydantic schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.identity import RequestStatus


class IdentityRequestCreate(BaseModel):
    case_id: UUID
    account_id: Optional[UUID] = None
    account_pseudo_id: Optional[str] = None
    requested_by: str = "investigator"
    justification: str


class IdentityReview(BaseModel):
    status: RequestStatus
    reviewed_by: str = "bank_reviewer"
    review_notes: Optional[str] = None
    disclosed_fields: List[str] = ["real_name", "phone", "real_account_number"]


class IdentityRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    account_id: UUID
    account_pseudo_id: Optional[str] = None
    requested_by: str
    justification: str
    status: RequestStatus
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    disclosed_fields: Optional[List[str]] = None
    requested_at: datetime
    reviewed_at: Optional[datetime] = None
    disclosed_data: Optional[Dict[str, Any]] = None
