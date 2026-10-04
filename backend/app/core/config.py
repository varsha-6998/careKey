from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven configuration. Secrets belong in .env, never in source."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "CareKey API"
    environment: str = "development"
    database_url: str = Field(
        default="postgresql+psycopg://carekey:carekey@localhost:5432/carekey",
        description="SQLAlchemy URL using the psycopg (v3) driver.",
    )
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    local_storage_dir: str = "./storage"
    osrm_base_url: str | None = None
    firebase_project_id: str | None = None
    firebase_credentials_path: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
