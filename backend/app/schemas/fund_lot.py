"""Fund lot and lineage Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.fund_lot import LotStatus
from app.models.lineage_event import LineageEventType


class FundLotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lot_ref: str
    origin_id: UUID
    parent_lot_id: Optional[UUID] = None
    current_account_id: UUID
    current_account_pseudo_id: Optional[str] = None
    current_account_bank: Optional[str] = None
    attributed_amount: Decimal
    remaining_amount: Decimal
    status: LotStatus
    source_transaction_id: Optional[UUID] = None
    hop_count: int
    created_at: datetime


class LineageEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lot_id: UUID
    event_type: LineageEventType
    transaction_id: Optional[UUID] = None
    amount: Decimal
    from_account_id: Optional[UUID] = None
    to_account_id: Optional[UUID] = None
    from_pseudo_id: Optional[str] = None
    to_pseudo_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
