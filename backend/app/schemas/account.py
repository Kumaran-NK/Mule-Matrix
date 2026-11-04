"""Account Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.account import AccountType


class AccountBase(BaseModel):
    pseudo_id: str
    bank_id: UUID
    account_type: AccountType = AccountType.SAVINGS
    opening_balance: Decimal = Decimal("0.00")
    current_balance: Decimal = Decimal("0.00")
    is_active: bool = True


class AccountCreate(BaseModel):
    pseudo_id: str
    bank_id: UUID
    account_type: AccountType = AccountType.SAVINGS
    opening_balance: Decimal = Decimal("0.00")


class AccountResponse(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
