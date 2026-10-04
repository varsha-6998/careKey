from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.core.database import get_engine
from app.schemas.health import HealthResponse, ReadyResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="carekey-api")


@router.get("/health/ready", response_model=ReadyResponse)
def ready() -> ReadyResponse:
    """Liveness plus a PostgreSQL ping. Returns 503 if the database is unreachable."""
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database is not reachable",
        ) from None
    return ReadyResponse(status="ok", database="connected")
