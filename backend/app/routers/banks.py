"""Banks API router."""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.bank import Bank
from app.schemas.bank import BankCreate, BankResponse

router = APIRouter()


@router.get("", response_model=List[BankResponse])
def list_banks(db: Session = Depends(get_db)):
    """List all participating and non-participating banks."""
    return db.query(Bank).order_by(Bank.code).all()


@router.post("", response_model=BankResponse, status_code=status.HTTP_201_CREATED)
def create_bank(payload: BankCreate, db: Session = Depends(get_db)):
    """Register a new bank."""
    existing = db.query(Bank).filter(Bank.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Bank with code {payload.code} already exists.")
    bank = Bank(code=payload.code, name=payload.name, is_participating=payload.is_participating)
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank


@router.get("/{bank_id}", response_model=BankResponse)
def get_bank(bank_id: UUID, db: Session = Depends(get_db)):
    """Get bank details by ID."""
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found.")
    return bank
