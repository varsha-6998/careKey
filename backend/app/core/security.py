"""Firebase ID-token authentication for FastAPI routes."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.firebase import (
    FirebaseIdentity,
    FirebaseNotConfiguredError,
    FirebaseTokenError,
    verify_id_token,
)
from app.models.user import User
from app.services.users import get_or_create_user_from_identity

_bearer = HTTPBearer(auto_error=False)

_UNAUTHORIZED = {
    "missing": "Missing authorization token",
    "invalid": "Invalid authorization token",
    "expired": "Authorization token has expired",
    "revoked": "Authorization token has been revoked",
    "disabled": "User account is disabled",
}


def _http_error(status_code: int, detail: str) -> HTTPException:
    headers = {"WWW-Authenticate": "Bearer"} if status_code == status.HTTP_401_UNAUTHORIZED else None
    return HTTPException(status_code=status_code, detail=detail, headers=headers)


def get_firebase_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> FirebaseIdentity:
    """Read Authorization: Bearer <token> and verify it with Firebase Admin."""
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise _http_error(status.HTTP_401_UNAUTHORIZED, _UNAUTHORIZED["missing"])

    try:
        return verify_id_token(credentials.credentials)
    except FirebaseNotConfiguredError as exc:
        raise _http_error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Authentication is not configured",
        ) from exc
    except FirebaseTokenError as exc:
        if exc.reason == "unavailable":
            raise _http_error(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Authentication service unavailable",
            ) from exc
        raise _http_error(
            status.HTTP_401_UNAUTHORIZED,
            _UNAUTHORIZED.get(exc.reason, _UNAUTHORIZED["invalid"]),
        ) from exc


def get_current_user(
    identity: FirebaseIdentity = Depends(get_firebase_identity),
    db: Session = Depends(get_db),
) -> User:
    """Return the application user for a verified Firebase identity.

    Role is never taken from the request. New users are bootstrapped as patients.
    """
    return get_or_create_user_from_identity(db, identity)
