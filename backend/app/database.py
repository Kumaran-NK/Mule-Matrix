"""Database engine, session, and base model configuration.

Supports PostgreSQL and SQLite seamlessly. Engine is lazily created
to allow test overrides before first use.
"""

from typing import Generator, Optional
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


# Module-level singletons, lazily initialized
_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None


def _get_connect_args(url: str) -> dict:
    if "sqlite" in url:
        return {"check_same_thread": False}
    return {}


def _make_url(url: str) -> str:
    """Normalize async driver URLs to sync equivalents."""
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://")
    return url


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        db_url = _make_url(settings.DATABASE_URL)
        _engine = create_engine(
            db_url,
            echo=False,
            connect_args=_get_connect_args(db_url),
            pool_pre_ping=True,
        )
    return _engine


def get_session_factory() -> sessionmaker:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=get_engine()
        )
    return _SessionLocal


def set_engine(eng: Engine) -> None:
    """Allow tests to inject a custom engine before app start."""
    global _engine, _SessionLocal
    _engine = eng
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=eng)


# Convenience aliases
@property
def engine():
    return get_engine()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session."""
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables in the database."""
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=get_engine())
