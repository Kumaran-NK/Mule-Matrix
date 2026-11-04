"""Cases API router — central investigation case management & tracing endpoints."""

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.assessment import AccountAssessment
from app.models.case import Case, CaseStatus
from app.models.endpoint import EndpointObservation
from app.models.fund_lot import FundLot
from app.models.lineage_event import LineageEvent
from app.models.origin import Origin
from app.models.trace_run import AllocationPolicy, TraceRun, TraceStatus
from app.models.transaction import Transaction
from app.schemas.assessment import AccountAssessmentResponse
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate
from app.schemas.endpoint import EndpointObservationResponse
from app.schemas.fund_lot import FundLotResponse, LineageEventResponse
from app.schemas.origin import OriginResponse
from app.schemas.trace import GraphResponse, ReconciliationSummary, TraceRequest, TraceRunResponse
from app.services.audit_service import AuditService
from app.services.provenance_engine import ProvenanceEngine, quantize_amount
from app.services.trace_engine import TraceEngine

router = APIRouter()


def _to_case_response(case: Case) -> CaseResponse:
    return CaseResponse(
        id=case.id,
        case_ref=case.case_ref,
        title=case.title,
        description=case.description,
        status=case.status,
        created_by=case.created_by,
        created_at=case.created_at,
        updated_at=case.updated_at,
        origins=[
            OriginResponse(
                id=o.id,
                origin_ref=o.origin_ref,
                case_id=o.case_id,
                seed_transaction_id=o.seed_transaction_id,
                origin_amount=o.origin_amount,
                currency=o.currency,
                status=o.status,
                created_at=o.created_at,
                retracted_at=o.retracted_at,
                retraction_reason=o.retraction_reason,
            )
            for o in case.origins
        ],
        trace_count=len(case.trace_runs),
    )


@router.get("", response_model=List[CaseResponse])
def list_cases(
    status: Optional[CaseStatus] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List investigation cases."""
    query = db.query(Case)
    if status:
        query = query.filter(Case.status == status)
    cases = query.order_by(Case.created_at.desc()).offset(offset).limit(limit).all()
    return [_to_case_response(c) for c in cases]


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    """Create a new case, optionally initializing origin from a seed transaction."""
    case_ref = f"CASE-{uuid4().hex[:8].upper()}"
    case = Case(
        case_ref=case_ref,
        title=payload.title,
        description=payload.description,
        status=CaseStatus.OPEN,
        created_by=payload.created_by,
    )
    db.add(case)
    db.flush()

    # Find seed transaction if specified
    seed_tx = None
    if payload.seed_transaction_id:
        seed_tx = db.query(Transaction).filter(Transaction.id == payload.seed_transaction_id).first()
    elif payload.seed_transaction_ref:
        seed_tx = db.query(Transaction).filter(Transaction.transaction_ref == payload.seed_transaction_ref).first()

    if seed_tx:
        origin = ProvenanceEngine.create_origin(
            db=db,
            case_id=case.id,
            seed_tx=seed_tx,
            origin_amount=payload.origin_amount or seed_tx.amount,
        )
        ProvenanceEngine.create_initial_lot(db, origin, seed_tx.receiver_account_id)

    db.commit()
    db.refresh(case)

    AuditService.log(
        db=db,
        actor=payload.created_by,
        action="CASE_CREATED",
        target_type="case",
        target_id=str(case.id),
        details={"case_ref": case.case_ref, "title": case.title},
    )
    return _to_case_response(case)


@router.get("/{identifier}", response_model=CaseResponse)
def get_case(identifier: str, db: Session = Depends(get_db)):
    """Get case details by ID or case_ref."""
    case = None
    try:
        case_uuid = UUID(identifier)
        case = db.query(Case).filter(Case.id == case_uuid).first()
    except ValueError:
        pass

    if not case:
        case = db.query(Case).filter(Case.case_ref == identifier).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    return _to_case_response(case)


@router.post("/{case_id}/trace", response_model=TraceRunResponse)
def run_case_trace(
    case_id: UUID,
    payload: TraceRequest,
    db: Session = Depends(get_db),
):
    """Execute a temporal trace on the case origin."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    origin = db.query(Origin).filter(Origin.case_id == case.id).first()
    if not origin:
        raise HTTPException(status_code=400, detail="Case does not have an active origin configured.")

    trace_run = TraceEngine.execute_trace(
        db=db,
        case=case,
        origin=origin,
        policy=payload.allocation_policy,
        direction=payload.direction,
        max_hops=payload.max_hops,
        window_start=payload.window_start,
        window_end=payload.window_end,
    )
    return trace_run


@router.get("/{case_id}/graph", response_model=GraphResponse)
def get_case_graph(case_id: UUID, db: Session = Depends(get_db)):
    """Get node-link graph data for React Flow visualization."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    latest_trace = (
        db.query(TraceRun)
        .filter(TraceRun.case_id == case_id)
        .order_by(TraceRun.started_at.desc())
        .first()
    )
    if not latest_trace:
        # If no trace run yet, run one automatically using default FIFO policy
        origin = db.query(Origin).filter(Origin.case_id == case.id).first()
        if not origin:
            raise HTTPException(status_code=400, detail="Case has no origin configured.")
        latest_trace = TraceEngine.execute_trace(db, case, origin)

    return TraceEngine.get_graph_data(db, latest_trace.id)


@router.get("/{case_id}/lots", response_model=List[FundLotResponse])
def get_case_fund_lots(case_id: UUID, db: Session = Depends(get_db)):
    """Get provenance fund lots for the case."""
    origin = db.query(Origin).filter(Origin.case_id == case_id).first()
    if not origin:
        return []

    lots = db.query(FundLot).filter(FundLot.origin_id == origin.id).order_by(FundLot.hop_count, FundLot.created_at).all()
    res = []
    for lot in lots:
        acc = lot.current_account
        res.append(
            FundLotResponse(
                id=lot.id,
                lot_ref=lot.lot_ref,
                origin_id=lot.origin_id,
                parent_lot_id=lot.parent_lot_id,
                current_account_id=lot.current_account_id,
                current_account_pseudo_id=acc.pseudo_id if acc else None,
                current_account_bank=acc.bank.name if acc and acc.bank else None,
                attributed_amount=lot.attributed_amount,
                remaining_amount=lot.remaining_amount,
                status=lot.status,
                source_transaction_id=lot.source_transaction_id,
                hop_count=lot.hop_count,
                created_at=lot.created_at,
            )
        )
    return res


@router.get("/{case_id}/endpoints", response_model=List[EndpointObservationResponse])
def get_case_endpoints(case_id: UUID, db: Session = Depends(get_db)):
    """Get observed terminal endpoints."""
    latest_trace = (
        db.query(TraceRun)
        .filter(TraceRun.case_id == case_id)
        .order_by(TraceRun.started_at.desc())
        .first()
    )
    if not latest_trace:
        return []

    endpoints = (
        db.query(EndpointObservation)
        .filter(EndpointObservation.trace_run_id == latest_trace.id)
        .all()
    )
    res = []
    for ep in endpoints:
        acc = ep.account
        tx = ep.last_transaction
        res.append(
            EndpointObservationResponse(
                id=ep.id,
                trace_run_id=ep.trace_run_id,
                lot_id=ep.lot_id,
                account_id=ep.account_id,
                account_pseudo_id=acc.pseudo_id if acc else None,
                bank_name=acc.bank.name if acc and acc.bank else None,
                category=ep.category,
                attributed_amount=ep.attributed_amount,
                last_transaction_id=ep.last_transaction_id,
                last_transaction_ref=tx.transaction_ref if tx else None,
                reason=ep.reason,
                created_at=ep.created_at,
            )
        )
    return res


@router.get("/{case_id}/assessments", response_model=List[AccountAssessmentResponse])
def get_case_assessments(case_id: UUID, db: Session = Depends(get_db)):
    """Get account assessments with evidence scores and pattern detections."""
    latest_trace = (
        db.query(TraceRun)
        .filter(TraceRun.case_id == case_id)
        .order_by(TraceRun.started_at.desc())
        .first()
    )
    if not latest_trace:
        return []

    assessments = (
        db.query(AccountAssessment)
        .filter(AccountAssessment.trace_run_id == latest_trace.id)
        .all()
    )
    res = []
    for a in assessments:
        acc = a.account
        res.append(
            AccountAssessmentResponse(
                id=a.id,
                trace_run_id=a.trace_run_id,
                account_id=a.account_id,
                account_pseudo_id=acc.pseudo_id if acc else None,
                bank_code=acc.bank.code if acc and acc.bank else None,
                bank_name=acc.bank.name if acc and acc.bank else None,
                account_type=acc.account_type.value if acc else None,
                category=a.category,
                confidence_score=a.confidence_score,
                behavioral_score=a.behavioral_score,
                temporal_score=a.temporal_score,
                graph_score=a.graph_score,
                fund_score=a.fund_score,
                relationship_score=a.relationship_score,
                evidence=a.evidence,
                attributed_amount=a.attributed_amount,
                attributed_fraction=a.attributed_fraction,
                patterns_detected=a.patterns_detected,
                created_at=a.created_at,
            )
        )
    return res


@router.get("/{case_id}/reconciliation", response_model=ReconciliationSummary)
def get_case_reconciliation(case_id: UUID, db: Session = Depends(get_db)):
    """Reconcile total origin amount against observed endpoints and balances."""
    origin = db.query(Origin).filter(Origin.case_id == case_id).first()
    if not origin:
        raise HTTPException(status_code=404, detail="Case has no origin configured.")

    latest_trace = (
        db.query(TraceRun)
        .filter(TraceRun.case_id == case_id)
        .order_by(TraceRun.started_at.desc())
        .first()
    )
    policy = latest_trace.allocation_policy if latest_trace else AllocationPolicy.FIFO

    recon = ProvenanceEngine.reconcile_origin(db, origin)
    return ReconciliationSummary(
        origin_amount=recon["origin_amount"],
        total_allocated=recon["total_accounted"],
        total_retained=recon["retained_balance"],
        total_endpoints=recon["total_endpoints"],
        total_reversed=recon["total_reversed"],
        total_residual=recon["unresolved_active"],
        is_balanced=recon["is_balanced"],
        discrepancy=recon["discrepancy"],
        policy_used=policy,
        details=recon["details"],
    )
