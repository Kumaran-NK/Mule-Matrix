"""Simulator API router — interactive bank simulation controls."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import Base, get_db, get_engine
from app.models.account import Account
from app.models.bank import Bank
from app.models.transaction import PaymentChannel, Transaction, TransactionStatus
from app.services.audit_service import AuditService
from app.services.provenance_engine import quantize_amount
from app.services.seed_data import seed_database
from app.services.transaction_service import TransactionService

router = APIRouter()


class SimulatorTransferRequest(BaseModel):
    sender_pseudo_id: str
    receiver_pseudo_id: str
    amount: Decimal
    channel: PaymentChannel = PaymentChannel.UPI
    description: Optional[str] = "Simulated net-banking transfer"


@router.get("/status")
def get_simulator_status(db: Session = Depends(get_db)):
    """Get banking simulator state summary."""
    bank_count = db.query(Bank).count()
    acc_count = db.query(Account).count()
    tx_count = db.query(Transaction).count()
    total_balance = sum((acc.current_balance for acc in db.query(Account).all()), Decimal("0.00"))

    return {
        "is_active": True,
        "banks_count": bank_count,
        "accounts_count": acc_count,
        "transactions_count": tx_count,
        "total_simulated_liquidity": float(total_balance),
        "status": "OPERATIONAL",
    }


@router.post("/seed")
def trigger_seed(db: Session = Depends(get_db)):
    """Seed the database with synthetic banking data if not already populated."""
    res = seed_database(db)
    return res


@router.post("/reset")
def reset_simulation(db: Session = Depends(get_db)):
    """Reset all tables and re-seed the standard demo dataset."""
    engine = get_engine()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    res = seed_database(db)
    AuditService.log(
        db=db,
        actor="system_admin",
        action="SIMULATION_RESET_AND_RESEEDED",
        details=res,
    )
    return {"message": "Simulation reset and re-seeded successfully.", "details": res}


@router.post("/transfer")
def execute_simulated_transfer(
    payload: SimulatorTransferRequest,
    db: Session = Depends(get_db),
):
    """Execute a simulated transfer between two pseudonymous accounts."""
    sender = db.query(Account).filter(Account.pseudo_id == payload.sender_pseudo_id).first()
    receiver = db.query(Account).filter(Account.pseudo_id == payload.receiver_pseudo_id).first()

    if not sender:
        raise HTTPException(status_code=404, detail=f"Sender account '{payload.sender_pseudo_id}' not found.")
    if not receiver:
        raise HTTPException(status_code=404, detail=f"Receiver account '{payload.receiver_pseudo_id}' not found.")

    tx = TransactionService.create_transaction(
        db=db,
        sender_account_id=sender.id,
        receiver_account_id=receiver.id,
        amount=payload.amount,
        timestamp=datetime.now(timezone.utc),
        channel=payload.channel,
        status=TransactionStatus.POSTED,
        description=payload.description,
    )

    AuditService.log(
        db=db,
        actor="bank_simulator",
        action="SIMULATED_TRANSFER_EXECUTED",
        target_type="transaction",
        target_id=str(tx.id),
        details={
            "sender": sender.pseudo_id,
            "receiver": receiver.pseudo_id,
            "amount": float(tx.amount),
            "channel": tx.channel.value,
        },
    )

    return {
        "status": "success",
        "transaction_ref": tx.transaction_ref,
        "sender_balance_after": float(sender.current_balance),
        "receiver_balance_after": float(receiver.current_balance),
    }
