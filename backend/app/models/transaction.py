"""Transaction model — represents a financial transfer between accounts."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    POSTED = "POSTED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REVERSED = "REVERSED"


class PaymentChannel(str, enum.Enum):
    UPI = "UPI"
    IMPS = "IMPS"
    NEFT = "NEFT"
    RTGS = "RTGS"
    INTERNAL = "INTERNAL"
    ATM = "ATM"
    MERCHANT_POS = "MERCHANT_POS"
    WALLET = "WALLET"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    transaction_ref: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    sender_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id"), nullable=False
    )
    receiver_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id"), nullable=False
    )
    sender_bank_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("banks.id"), nullable=False
    )
    receiver_bank_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("banks.id"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), default=TransactionStatus.POSTED
    )
    channel: Mapped[PaymentChannel] = mapped_column(
        Enum(PaymentChannel), default=PaymentChannel.UPI
    )
    payment_reference: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    reversal_of_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("transactions.id"), nullable=True
    )
    is_reversal: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    sender_account = relationship(
        "Account",
        foreign_keys=[sender_account_id],
        back_populates="sent_transactions",
        lazy="selectin",
    )
    receiver_account = relationship(
        "Account",
        foreign_keys=[receiver_account_id],
        back_populates="received_transactions",
        lazy="selectin",
    )
    sender_bank = relationship(
        "Bank", foreign_keys=[sender_bank_id], lazy="selectin"
    )
    receiver_bank = relationship(
        "Bank", foreign_keys=[receiver_bank_id], lazy="selectin"
    )
    reversed_transaction = relationship(
        "Transaction", remote_side="Transaction.id", foreign_keys=[reversal_of_id], lazy="selectin"
    )
