"""Pytest configuration and shared fixtures for Mule Matrix tests.

Ensures test isolation by resetting and re-seeding the in-memory SQLite database
for every single test function.
"""

from typing import Generator
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# 1. Create test engine FIRST
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# 2. Override BEFORE any app import triggers engine creation
from app import database as db_module  # noqa: E402
db_module.set_engine(test_engine)

# 3. Import app and services
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services.seed_data import seed_database  # noqa: E402

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Provide a fresh, isolated database session seeded with standard demo data."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    seed_database(session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)
