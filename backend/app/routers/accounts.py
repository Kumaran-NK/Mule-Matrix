"""Accounts API router — exposes pseudonymous account representations."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account, AccountType
from app.models.bank import Bank
from app.schemas.account import AccountCreate, AccountResponse

router = APIRouter()


def _to_account_response(acc: Account) -> AccountResponse:
    return AccountResponse(
        id=acc.id,
        pseudo_id=acc.pseudo_id,
        bank_id=acc.bank_id,
        bank_code=acc.bank.code if acc.bank else None,
        bank_name=acc.bank.name if acc.bank else None,
        account_type=acc.account_type,
        opening_balance=acc.opening_balance,
        current_balance=acc.current_balance,
        is_active=acc.is_active,
        created_at=acc.created_at,
    )


@router.get("", response_model=List[AccountResponse])
def list_accounts(
    bank_id: Optional[UUID] = None,
    account_type: Optional[AccountType] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List pseudonymous accounts."""
    query = db.query(Account)
    if bank_id:
        query = query.filter(Account.bank_id == bank_id)
    if account_type:
        query = query.filter(Account.account_type == account_type)
    accounts = query.order_by(Account.pseudo_id).offset(offset).limit(limit).all()
    return [_to_account_response(acc) for acc in accounts]


@router.get("/{identifier}", response_model=AccountResponse)
def get_account(identifier: str, db: Session = Depends(get_db)):
    """Get account by UUID or pseudo_id."""
    account = None
    try:
        acc_uuid = UUID(identifier)
        account = db.query(Account).filter(Account.id == acc_uuid).first()
    except ValueError:
        pass

    if not account:
        account = db.query(Account).filter(Account.pseudo_id == identifier).first()

    if not account:
        raise HTTPException(status_code=404, detail=f"Account '{identifier}' not found.")

    return _to_account_response(account)
