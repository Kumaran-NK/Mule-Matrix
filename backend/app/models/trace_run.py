"""TraceRun model — records a provenance trace execution."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AllocationPolicy(str, enum.Enum):
    FIFO = "FIFO"
    PROPORTIONAL = "PROPORTIONAL"


class TraceDirection(str, enum.Enum):
    FORWARD = "FORWARD"
    BACKWARD = "BACKWARD"
    COMBINED = "COMBINED"


class TraceStatus(str, enum.Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TraceRun(Base):
    __tablename__ = "trace_runs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cases.id"), nullable=False
    )
    origin_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("origins.id"), nullable=False
    )
    allocation_policy: Mapped[AllocationPolicy] = mapped_column(
        Enum(AllocationPolicy), default=AllocationPolicy.FIFO
    )
    direction: Mapped[TraceDirection] = mapped_column(
        Enum(TraceDirection), default=TraceDirection.FORWARD
    )
    max_hops: Mapped[int] = mapped_column(Integer, default=10)
    window_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    window_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[TraceStatus] = mapped_column(
        Enum(TraceStatus), default=TraceStatus.RUNNING
    )
    total_attributed: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00")
    )
    total_endpoints: Mapped[int] = mapped_column(Integer, default=0)
    total_accounts_discovered: Mapped[int] = mapped_column(Integer, default=0)
    cycles_detected: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    case = relationship("Case", back_populates="trace_runs", lazy="selectin")
    origin = relationship("Origin", lazy="selectin")
    assessments = relationship(
        "AccountAssessment", back_populates="trace_run", lazy="selectin"
    )
    endpoints = relationship(
        "EndpointObservation", back_populates="trace_run", lazy="selectin"
    )
