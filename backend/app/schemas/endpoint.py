"""Endpoint observation Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.endpoint import EndpointCategory


class EndpointObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trace_run_id: UUID
    lot_id: UUID
    account_id: UUID
    account_pseudo_id: Optional[str] = None
    bank_name: Optional[str] = None
    category: EndpointCategory
    attributed_amount: Decimal
    last_transaction_id: Optional[UUID] = None
    last_transaction_ref: Optional[str] = None
    reason: str
    created_at: datetime
