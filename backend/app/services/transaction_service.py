"""Transaction service — handles transaction ingestion, queries, and balance updates."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.transaction import PaymentChannel, Transaction, TransactionStatus
from app.services.provenance_engine import quantize_amount


class TransactionService:
    @staticmethod
    def create_transaction(
        db: Session,
        sender_account_id: UUID,
        receiver_account_id: UUID,
        amount: Decimal,
        timestamp: datetime,
        channel: PaymentChannel = PaymentChannel.UPI,
        status: TransactionStatus = TransactionStatus.POSTED,
        transaction_ref: Optional[str] = None,
        payment_reference: Optional[str] = None,
        description: Optional[str] = None,
        reversal_of_id: Optional[UUID] = None,
        is_reversal: bool = False,
    ) -> Transaction:
        """Ingest or create a new transaction."""
        sender = db.query(Account).filter(Account.id == sender_account_id).first()
        receiver = db.query(Account).filter(Account.id == receiver_account_id).first()

        if not sender or not receiver:
            raise ValueError("Sender and receiver accounts must exist.")

        amt = quantize_amount(amount)
        if amt <= Decimal("0.00"):
            raise ValueError("Transaction amount must be strictly positive.")

        ref = transaction_ref or f"TX-{uuid4().hex[:10].upper()}"

        tx = Transaction(
            transaction_ref=ref,
            sender_account_id=sender.id,
            receiver_account_id=receiver.id,
            sender_bank_id=sender.bank_id,
            receiver_bank_id=receiver.bank_id,
            amount=amt,
            currency="INR",
            timestamp=timestamp,
            status=status,
            channel=channel,
            payment_reference=payment_reference,
            description=description,
            reversal_of_id=reversal_of_id,
            is_reversal=is_reversal,
            ingested_at=datetime.now(timezone.utc),
        )
        db.add(tx)

        # Update balances if transaction is POSTED
        if status == TransactionStatus.POSTED:
            sender.current_balance = quantize_amount(sender.current_balance - amt)
            receiver.current_balance = quantize_amount(receiver.current_balance + amt)

        db.commit()
        db.refresh(tx)
        return tx

    @staticmethod
    def list_transactions(
        db: Session,
        limit: int = 100,
        offset: int = 0,
        account_id: Optional[UUID] = None,
        status: Optional[TransactionStatus] = None,
    ) -> List[Transaction]:
        """Query transactions with optional filtering."""
        query = db.query(Transaction)
        if account_id:
            query = query.filter(
                (Transaction.sender_account_id == account_id)
                | (Transaction.receiver_account_id == account_id)
            )
        if status:
            query = query.filter(Transaction.status == status)
        return query.order_by(Transaction.timestamp.desc()).offset(offset).limit(limit).all()
