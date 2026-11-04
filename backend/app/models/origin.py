"""Origin model — represents a suspicious-fund investigation origin."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OriginStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RETRACTED = "RETRACTED"
    CORRECTED = "CORRECTED"


class Origin(Base):
    __tablename__ = "origins"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    origin_ref: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cases.id"), nullable=False
    )
    seed_transaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("transactions.id"), nullable=False
    )
    origin_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[OriginStatus] = mapped_column(
        Enum(OriginStatus), default=OriginStatus.ACTIVE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    retracted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    retraction_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    case = relationship("Case", back_populates="origins", lazy="selectin")
    seed_transaction = relationship("Transaction", lazy="selectin")
    fund_lots = relationship("FundLot", back_populates="origin", lazy="selectin")
