"""LineageEvent model — records provenance lifecycle events for fund lots."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LineageEventType(str, enum.Enum):
    CREATED = "CREATED"
    SPLIT = "SPLIT"
    CONSUMED = "CONSUMED"
    ENDPOINT_REACHED = "ENDPOINT_REACHED"
    REVERSED = "REVERSED"
    RETRACTED = "RETRACTED"
    CORRECTION = "CORRECTION"


class LineageEvent(Base):
    __tablename__ = "lineage_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fund_lots.id"), nullable=False
    )
    event_type: Mapped[LineageEventType] = mapped_column(
        Enum(LineageEventType), nullable=False
    )
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("transactions.id"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    from_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id"), nullable=True
    )
    to_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id"), nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    lot = relationship("FundLot", back_populates="lineage_events", lazy="selectin")
    transaction = relationship("Transaction", lazy="selectin")
