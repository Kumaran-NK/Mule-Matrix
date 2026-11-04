"""Account model — represents a bank account with pseudonymous identifier."""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AccountType(str, enum.Enum):
    SAVINGS = "SAVINGS"
    CURRENT = "CURRENT"
    MERCHANT = "MERCHANT"
    WALLET = "WALLET"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    pseudo_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    bank_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("banks.id"), nullable=False
    )
    account_type: Mapped[AccountType] = mapped_column(
        Enum(AccountType), default=AccountType.SAVINGS
    )
    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00")
    )
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    bank = relationship("Bank", back_populates="accounts", lazy="selectin")
    sent_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.sender_account_id",
        back_populates="sender_account",
        lazy="selectin",
    )
    received_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.receiver_account_id",
        back_populates="receiver_account",
        lazy="selectin",
    )
    fund_lots = relationship("FundLot", back_populates="current_account", lazy="selectin")
    identity_mapping = relationship(
        "IdentityMapping", back_populates="account", uselist=False, lazy="selectin"
    )
