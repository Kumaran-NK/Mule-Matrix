"""FundLot model — CBDC-inspired provenance lot tracking suspicious-origin funds."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LotStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SPLIT = "SPLIT"
    CONSUMED = "CONSUMED"
    REVERSED = "REVERSED"
    RETRACTED = "RETRACTED"


class FundLot(Base):
    __tablename__ = "fund_lots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lot_ref: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    origin_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("origins.id"), nullable=False
    )
    parent_lot_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("fund_lots.id"), nullable=True
    )
    current_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id"), nullable=False
    )
    attributed_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    remaining_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    status: Mapped[LotStatus] = mapped_column(
        Enum(LotStatus), default=LotStatus.ACTIVE
    )
    source_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("transactions.id"), nullable=True
    )
    hop_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    origin = relationship("Origin", back_populates="fund_lots", lazy="selectin")
    parent_lot = relationship(
        "FundLot", remote_side="FundLot.id", foreign_keys=[parent_lot_id], back_populates="child_lots", lazy="selectin"
    )
    child_lots = relationship(
        "FundLot", foreign_keys=[parent_lot_id], back_populates="parent_lot", lazy="selectin", overlaps="parent_lot"
    )
    current_account = relationship(
        "Account", back_populates="fund_lots", lazy="selectin"
    )
    source_transaction = relationship("Transaction", lazy="selectin")
    lineage_events = relationship(
        "LineageEvent", back_populates="lot", lazy="selectin"
    )
