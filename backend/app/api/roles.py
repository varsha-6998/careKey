"""Minimal role-gated probes so RBAC can be exercised without domain APIs."""

from fastapi import APIRouter, Depends

from app.core.security import require_roles
from app.models.enums import AppRole
from app.models.user import User
from app.schemas.auth import AuthMeResponse

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("/patient", response_model=AuthMeResponse)
def patient_access(user: User = Depends(require_roles(AppRole.PATIENT))) -> User:
    return user


@router.get("/doctor", response_model=AuthMeResponse)
def doctor_access(user: User = Depends(require_roles(AppRole.DOCTOR))) -> User:
    return user


@router.get("/admin", response_model=AuthMeResponse)
def admin_access(user: User = Depends(require_roles(AppRole.ADMIN))) -> User:
    return user
