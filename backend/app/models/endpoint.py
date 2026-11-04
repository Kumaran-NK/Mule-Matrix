"""EndpointObservation model — records where traced funds exit the observable network."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EndpointCategory(str, enum.Enum):
    ATM_WITHDRAWAL = "ATM_WITHDRAWAL"
    MERCHANT_PAYMENT = "MERCHANT_PAYMENT"
    WALLET_TRANSFER = "WALLET_TRANSFER"
    EXTERNAL_BANK = "EXTERNAL_BANK"
    CROSS_BORDER = "CROSS_BORDER"
    RETAINED_BALANCE = "RETAINED_BALANCE"
    NO_FURTHER_RECORD = "NO_FURTHER_RECORD"


class EndpointObservation(Base):
    __tablename__ = "endpoint_observations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trace_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trace_runs.id"), nullable=False
    )
    lot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fund_lots.id"), nullable=False
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id"), nullable=False
    )
    category: Mapped[EndpointCategory] = mapped_column(
        Enum(EndpointCategory), nullable=False
    )
    attributed_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    last_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("transactions.id"), nullable=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    trace_run = relationship(
        "TraceRun", back_populates="endpoints", lazy="selectin"
    )
    lot = relationship("FundLot", lazy="selectin")
    account = relationship("Account", lazy="selectin")
    last_transaction = relationship("Transaction", lazy="selectin")
