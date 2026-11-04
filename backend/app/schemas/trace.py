"""Trace and graph Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.assessment import AssessmentCategory
from app.models.trace_run import AllocationPolicy, TraceDirection, TraceStatus


class TraceRequest(BaseModel):
    allocation_policy: AllocationPolicy = AllocationPolicy.FIFO
    direction: TraceDirection = TraceDirection.FORWARD
    max_hops: int = 10
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None


class TraceRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    origin_id: UUID
    allocation_policy: AllocationPolicy
    direction: TraceDirection
    max_hops: int
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    status: TraceStatus
    total_attributed: Decimal
    total_endpoints: int
    total_accounts_discovered: int
    cycles_detected: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class GraphNode(BaseModel):
    id: str
    label: str
    pseudo_id: str
    account_id: str
    bank_code: str
    bank_name: str
    account_type: str
    current_balance: Decimal
    assessment_category: AssessmentCategory
    confidence_score: float
    attributed_amount: Decimal
    is_seed: bool = False
    is_endpoint: bool = False
    endpoint_type: Optional[str] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    transaction_id: str
    transaction_ref: str
    amount: Decimal
    currency: str
    timestamp: datetime
    status: str
    channel: str
    attributed_amount: Decimal
    is_reversal: bool = False


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    summary: Dict[str, Any]


class ReconciliationSummary(BaseModel):
    origin_amount: Decimal
    total_allocated: Decimal
    total_retained: Decimal
    total_endpoints: Decimal
    total_reversed: Decimal
    total_residual: Decimal
    is_balanced: bool
    discrepancy: Decimal
    policy_used: AllocationPolicy
    details: List[Dict[str, Any]]
