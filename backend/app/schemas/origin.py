"""Origin Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.origin import OriginStatus


class OriginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    origin_ref: str
    case_id: UUID
    seed_transaction_id: UUID
    origin_amount: Decimal
    currency: str
    status: OriginStatus
    created_at: datetime
    retracted_at: Optional[datetime] = None
    retraction_reason: Optional[str] = None
