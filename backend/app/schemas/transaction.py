"""Transaction Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.transaction import PaymentChannel, TransactionStatus


class TransactionBase(BaseModel):
    amount: Decimal
    currency: str = "INR"
    timestamp: datetime
    channel: PaymentChannel = PaymentChannel.UPI
    payment_reference: Optional[str] = None
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    transaction_ref: Optional[str] = None
    sender_account_id: Optional[UUID] = None
    receiver_account_id: Optional[UUID] = None
    sender_pseudo_id: Optional[str] = None
    receiver_pseudo_id: Optional[str] = None
    sender_bank_id: Optional[UUID] = None
    receiver_bank_id: Optional[UUID] = None
    status: TransactionStatus = TransactionStatus.POSTED
    reversal_of_id: Optional[UUID] = None
    is_reversal: bool = False


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    transaction_ref: str
    sender_account_id: UUID
    receiver_account_id: UUID
    sender_bank_id: UUID
    receiver_bank_id: UUID
    sender_pseudo_id: Optional[str] = None
    receiver_pseudo_id: Optional[str] = None
    sender_bank_code: Optional[str] = None
    receiver_bank_code: Optional[str] = None
    sender_bank_name: Optional[str] = None
    receiver_bank_name: Optional[str] = None
    status: TransactionStatus
    reversal_of_id: Optional[UUID] = None
    is_reversal: bool
    ingested_at: datetime
