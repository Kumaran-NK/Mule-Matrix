"""Account assessment Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.assessment import AssessmentCategory


class AccountAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trace_run_id: UUID
    account_id: UUID
    account_pseudo_id: Optional[str] = None
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_type: Optional[str] = None
    category: AssessmentCategory
    confidence_score: float
    behavioral_score: float
    temporal_score: float
    graph_score: float
    fund_score: float
    relationship_score: float
    evidence: Optional[Any] = None
    attributed_amount: Decimal
    attributed_fraction: float
    patterns_detected: Optional[List[str]] = None
    created_at: datetime
