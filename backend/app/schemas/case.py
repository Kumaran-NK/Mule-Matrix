"""Case Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.case import CaseStatus
from app.schemas.origin import OriginResponse


class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None


class CaseCreate(CaseBase):
    seed_transaction_id: Optional[UUID] = None
    seed_transaction_ref: Optional[str] = None
    origin_amount: Optional[Decimal] = None
    created_by: str = "investigator"


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None


class CaseResponse(CaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_ref: str
    status: CaseStatus
    created_by: str
    created_at: datetime
    updated_at: datetime
    origins: List[OriginResponse] = []
    trace_count: int = 0
