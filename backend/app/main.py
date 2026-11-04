"""Mule Matrix API — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import (
    accounts,
    audit,
    banks,
    cases,
    identity,
    screening,
    simulator,
    transactions,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database tables and seed demo data on startup."""
    try:
        init_db()
        logger.info("Database initialized successfully.")
        # Auto-seed demo data if no cases exist yet
        from app.database import get_session_factory
        from app.models.case import Case
        session_factory = get_session_factory()
        db = session_factory()
        try:
            existing_cases = db.query(Case).first()
            if not existing_cases:
                from app.services.seed_data import seed_database
                seed_database(db)
                logger.info("Demo seed data loaded successfully.")
            else:
                logger.info("Database already contains data, skipping seed.")
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Database init/seed warning: %s", exc)
    yield


app = FastAPI(
    title="Mule Matrix API",
    description="CBDC-inspired fund provenance and cross-bank mule-network investigation system.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(banks.router, prefix="/api/banks", tags=["Banks"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])
app.include_router(simulator.router, prefix="/api/simulator", tags=["Simulator"])
app.include_router(screening.router, prefix="/api/screening", tags=["Screening"])
app.include_router(identity.router, prefix="/api/identity", tags=["Identity"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "mule-matrix-api"}
