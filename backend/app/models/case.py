"""Case model — represents an investigation case."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    TRACING = "TRACING"
    TRACED = "TRACED"
    CLOSED = "CLOSED"
    RETRACTED = "RETRACTED"


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_ref: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CaseStatus] = mapped_column(
        Enum(CaseStatus), default=CaseStatus.OPEN
    )
    created_by: Mapped[str] = mapped_column(String(100), default="investigator")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    origins = relationship("Origin", back_populates="case", lazy="selectin")
    trace_runs = relationship("TraceRun", back_populates="case", lazy="selectin")
    identity_requests = relationship(
        "IdentityRequest", back_populates="case", lazy="selectin"
    )
