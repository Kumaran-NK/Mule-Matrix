"""Application configuration using pydantic-settings."""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./mule_matrix.db"
    )
    DATABASE_URL_SYNC: str = os.getenv(
        "DATABASE_URL_SYNC",
        "sqlite:///./mule_matrix.db"
    )
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse CORS_ORIGINS comma-separated string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
