from datetime import datetime, timezone
from collections.abc import Generator
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.firebase import FirebaseIdentity, FirebaseTokenError
from app.main import app
from app.models.enums import AppRole
from app.models.user import User
from app.services.users import get_or_create_user_from_identity


class _FakeDb:
    def __init__(self, user: User | None = None) -> None:
        self.user = user

    def scalar(self, _stmt):
        return self.user

    def add(self, obj: User) -> None:
        now = datetime.now(timezone.utc)
        if obj.id is None:
            obj.id = uuid4()
        obj.created_at = now
        obj.updated_at = now
        self.user = obj

    def commit(self) -> None:
        return None

    def refresh(self, _obj: User) -> None:
        return None

    def rollback(self) -> None:
        return None


@pytest.fixture
def auth_client() -> Generator[TestClient, None, None]:
    db = _FakeDb()

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_auth_me_missing_token(auth_client: TestClient):
    response = auth_client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authorization token"


def test_auth_me_invalid_token(auth_client: TestClient, monkeypatch: pytest.MonkeyPatch):
    def _invalid(_token: str) -> FirebaseIdentity:
        raise FirebaseTokenError("invalid")

    monkeypatch.setattr("app.core.security.verify_id_token", _invalid)
    response = auth_client.get("/auth/me", headers={"Authorization": "Bearer fake-token"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authorization token"


def test_auth_me_expired_token(auth_client: TestClient, monkeypatch: pytest.MonkeyPatch):
    def _expired(_token: str) -> FirebaseIdentity:
        raise FirebaseTokenError("expired")

    monkeypatch.setattr("app.core.security.verify_id_token", _expired)
    response = auth_client.get("/auth/me", headers={"Authorization": "Bearer expired-token"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Authorization token has expired"


def test_auth_me_bootstraps_patient_and_ignores_client_role(
    monkeypatch: pytest.MonkeyPatch,
):
    identity = FirebaseIdentity(firebase_uid="firebase-uid-1", email="user@example.com")
    monkeypatch.setattr("app.core.security.verify_id_token", lambda _token: identity)

    db = _FakeDb()

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            response = client.get(
                "/auth/me",
                headers={"Authorization": "Bearer valid-token"},
                params={"role": "admin"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["firebase_uid"] == "firebase-uid-1"
    assert body["email"] == "user@example.com"
    assert body["role"] == "patient"
    assert db.user is not None
    assert db.user.role == AppRole.PATIENT


def test_auth_me_returns_existing_user_role_from_database(
    monkeypatch: pytest.MonkeyPatch,
):
    now = datetime.now(timezone.utc)
    existing = User(
        id=uuid4(),
        firebase_uid="firebase-uid-2",
        email="doctor@example.com",
        role=AppRole.DOCTOR,
        created_at=now,
        updated_at=now,
    )
    identity = FirebaseIdentity(firebase_uid="firebase-uid-2", email="doctor@example.com")
    monkeypatch.setattr("app.core.security.verify_id_token", lambda _token: identity)

    db = _FakeDb(user=existing)

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            response = client.get(
                "/auth/me",
                headers={"Authorization": "Bearer valid-token"},
                params={"role": "admin"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["role"] == "doctor"


def test_verify_id_token_uses_uid_and_email_not_role_claim(monkeypatch: pytest.MonkeyPatch):
    from app.core.firebase import verify_id_token as verify_token

    monkeypatch.setattr("app.core.firebase.get_firebase_app", lambda: object())
    monkeypatch.setattr(
        "app.core.firebase.auth.verify_id_token",
        lambda _token, app=None, check_revoked=False: {
            "uid": "token-uid",
            "email": "token@example.com",
            "role": "admin",
        },
    )
    identity = verify_token("header.payload.sig")
    assert identity.firebase_uid == "token-uid"
    assert identity.email == "token@example.com"
    assert not hasattr(identity, "role")


def test_bootstrap_uses_verified_identity_not_client_fields():
    identity = FirebaseIdentity(firebase_uid="verified-uid", email="verified@example.com")
    db = MagicMock()
    db.scalar.return_value = None

    created: list[User] = []

    def _add(user: User) -> None:
        now = datetime.now(timezone.utc)
        if user.id is None:
            user.id = uuid4()
        user.created_at = now
        user.updated_at = now
        created.append(user)
        db.scalar.return_value = user

    db.add.side_effect = _add

    user = get_or_create_user_from_identity(db, identity)
    assert user.firebase_uid == "verified-uid"
    assert user.email == "verified@example.com"
    assert user.role == AppRole.PATIENT
    assert created[0].role == AppRole.PATIENT
