"""Identity models — bank-controlled identity mapping and disclosure request workflow."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class IdentityMapping(Base):
    """Bank-side identity mapping. Stored separately from the investigation graph."""

    __tablename__ = "identity_mappings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id"), unique=True, nullable=False
    )
    real_name: Mapped[str] = mapped_column(String(200), nullable=False)
    real_account_number: Mapped[str] = mapped_column(String(30), nullable=False)
    bank_branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    id_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    id_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    account = relationship(
        "Account", back_populates="identity_mapping", lazy="selectin"
    )


class IdentityRequest(Base):
    """Identity disclosure request with reviewer approval workflow."""

    __tablename__ = "identity_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cases.id"), nullable=False
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id"), nullable=False
    )
    requested_by: Mapped[str] = mapped_column(String(100), nullable=False)
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus), default=RequestStatus.PENDING
    )
    reviewed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    disclosed_fields: Mapped[list | None] = mapped_column(JSON, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    case = relationship("Case", back_populates="identity_requests", lazy="selectin")
    account = relationship("Account", lazy="selectin")
