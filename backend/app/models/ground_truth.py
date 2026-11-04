"""Ground truth models — for evaluation against known correct answers."""

import enum
import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Enum, ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AccountRole(str, enum.Enum):
    VICTIM = "VICTIM"
    MULE = "MULE"
    LEGITIMATE = "LEGITIMATE"
    MERCHANT = "MERCHANT"
    UNKNOWN = "UNKNOWN"


class GroundTruthAccount(Base):
    __tablename__ = "ground_truth_accounts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id"), nullable=False
    )
    true_role: Mapped[AccountRole] = mapped_column(
        Enum(AccountRole), nullable=False
    )
    is_mule_network_member: Mapped[bool] = mapped_column(Boolean, default=False)
    network_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    account = relationship("Account", lazy="selectin")


class GroundTruthPath(Base):
    __tablename__ = "ground_truth_paths"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    origin_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("origins.id"), nullable=True
    )
    path_description: Mapped[str] = mapped_column(Text, nullable=False)
    expected_endpoints: Mapped[list | None] = mapped_column(JSON, nullable=True)
    expected_total_attributed: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00")
    )
