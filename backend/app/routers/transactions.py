"""Transactions API router."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction, TransactionStatus
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.services.transaction_service import TransactionService

router = APIRouter()


def _to_tx_response(tx: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=tx.id,
        transaction_ref=tx.transaction_ref,
        sender_account_id=tx.sender_account_id,
        receiver_account_id=tx.receiver_account_id,
        sender_bank_id=tx.sender_bank_id,
        receiver_bank_id=tx.receiver_bank_id,
        sender_pseudo_id=tx.sender_account.pseudo_id if tx.sender_account else None,
        receiver_pseudo_id=tx.receiver_account.pseudo_id if tx.receiver_account else None,
        sender_bank_code=tx.sender_bank.code if tx.sender_bank else None,
        receiver_bank_code=tx.receiver_bank.code if tx.receiver_bank else None,
        sender_bank_name=tx.sender_bank.name if tx.sender_bank else None,
        receiver_bank_name=tx.receiver_bank.name if tx.receiver_bank else None,
        amount=tx.amount,
        currency=tx.currency,
        timestamp=tx.timestamp,
        status=tx.status,
        channel=tx.channel,
        payment_reference=tx.payment_reference,
        reversal_of_id=tx.reversal_of_id,
        is_reversal=tx.is_reversal,
        description=tx.description,
        ingested_at=tx.ingested_at,
    )


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    account_pseudo_id: Optional[str] = None,
    status: Optional[TransactionStatus] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List transactions with optional filters."""
    query = db.query(Transaction)
    if account_pseudo_id:
        acc = db.query(Account).filter(Account.pseudo_id == account_pseudo_id).first()
        if acc:
            query = query.filter(
                (Transaction.sender_account_id == acc.id)
                | (Transaction.receiver_account_id == acc.id)
            )
        else:
            return []

    if status:
        query = query.filter(Transaction.status == status)

    txs = query.order_by(Transaction.timestamp.desc()).offset(offset).limit(limit).all()
    return [_to_tx_response(tx) for tx in txs]


@router.get("/{identifier}", response_model=TransactionResponse)
def get_transaction(identifier: str, db: Session = Depends(get_db)):
    """Get transaction by UUID or transaction_ref."""
    tx = None
    try:
        tx_uuid = UUID(identifier)
        tx = db.query(Transaction).filter(Transaction.id == tx_uuid).first()
    except ValueError:
        pass

    if not tx:
        tx = db.query(Transaction).filter(Transaction.transaction_ref == identifier).first()

    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction '{identifier}' not found.")

    return _to_tx_response(tx)


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    """Ingest a new transaction."""
    sender_id = payload.sender_account_id
    receiver_id = payload.receiver_account_id

    if not sender_id and payload.sender_pseudo_id:
        s_acc = db.query(Account).filter(Account.pseudo_id == payload.sender_pseudo_id).first()
        if s_acc:
            sender_id = s_acc.id

    if not receiver_id and payload.receiver_pseudo_id:
        r_acc = db.query(Account).filter(Account.pseudo_id == payload.receiver_pseudo_id).first()
        if r_acc:
            receiver_id = r_acc.id

    if not sender_id or not receiver_id:
        raise HTTPException(status_code=400, detail="Valid sender and receiver accounts required.")

    tx = TransactionService.create_transaction(
        db=db,
        sender_account_id=sender_id,
        receiver_account_id=receiver_id,
        amount=payload.amount,
        timestamp=payload.timestamp,
        channel=payload.channel,
        status=payload.status,
        transaction_ref=payload.transaction_ref,
        payment_reference=payload.payment_reference,
        description=payload.description,
        reversal_of_id=payload.reversal_of_id,
        is_reversal=payload.is_reversal,
    )
    return _to_tx_response(tx)
