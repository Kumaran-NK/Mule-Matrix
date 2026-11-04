"""Bank Pydantic schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class BankBase(BaseModel):
    code: str
    name: str
    is_participating: bool = True


class BankCreate(BankBase):
    pass


class BankResponse(BankBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
