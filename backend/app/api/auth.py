from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.auth import AuthMeResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AuthMeResponse)
def read_me(user: User = Depends(get_current_user)) -> User:
    """Return the authenticated application user for a verified Firebase ID token."""
    return user
