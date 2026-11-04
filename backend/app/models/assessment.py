"""AccountAssessment model — evidence-based account suspicion assessment."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, Float, ForeignKey, JSON, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AssessmentCategory(str, enum.Enum):
    LIKELY_MULE = "LIKELY_MULE"
    LEGITIMATE_COUNTERPARTY = "LEGITIMATE_COUNTERPARTY"
    UNRESOLVED = "UNRESOLVED"
    MERCHANT = "MERCHANT"
    SEED_ACCOUNT = "SEED_ACCOUNT"


class AccountAssessment(Base):
    __tablename__ = "account_assessments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trace_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trace_runs.id"), nullable=False
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id"), nullable=False
    )
    category: Mapped[AssessmentCategory] = mapped_column(
        Enum(AssessmentCategory), default=AssessmentCategory.UNRESOLVED
    )
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    behavioral_score: Mapped[float] = mapped_column(Float, default=0.0)
    temporal_score: Mapped[float] = mapped_column(Float, default=0.0)
    graph_score: Mapped[float] = mapped_column(Float, default=0.0)
    fund_score: Mapped[float] = mapped_column(Float, default=0.0)
    relationship_score: Mapped[float] = mapped_column(Float, default=0.0)
    evidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    attributed_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00")
    )
    attributed_fraction: Mapped[float] = mapped_column(Float, default=0.0)
    patterns_detected: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    trace_run = relationship(
        "TraceRun", back_populates="assessments", lazy="selectin"
    )
    account = relationship("Account", lazy="selectin")
