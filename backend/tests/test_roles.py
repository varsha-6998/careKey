from collections.abc import Generator
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.firebase import FirebaseIdentity
from app.core.security import require_roles
from app.main import app
from app.models.enums import AppRole
from app.models.user import User


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


def _user(role: AppRole, firebase_uid: str = "uid-1", email: str = "user@example.com") -> User:
    now = datetime.now(timezone.utc)
    return User(
        id=uuid4(),
        firebase_uid=firebase_uid,
        email=email,
        role=role,
        created_at=now,
        updated_at=now,
    )


def _client_for(user: User, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    identity = FirebaseIdentity(firebase_uid=user.firebase_uid, email=user.email)
    monkeypatch.setattr("app.core.security.verify_id_token", lambda _token: identity)
    db = _FakeDb(user=user)

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def patient_client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    yield from _client_for(_user(AppRole.PATIENT, "patient-uid", "patient@example.com"), monkeypatch)


@pytest.fixture
def doctor_client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    yield from _client_for(_user(AppRole.DOCTOR, "doctor-uid", "doctor@example.com"), monkeypatch)


@pytest.fixture
def admin_client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    yield from _client_for(_user(AppRole.ADMIN, "admin-uid", "admin@example.com"), monkeypatch)


@pytest.mark.parametrize(
    ("client_fixture", "path", "status_code"),
    [
        ("patient_client", "/roles/patient", 200),
        ("doctor_client", "/roles/patient", 403),
        ("admin_client", "/roles/patient", 403),
        ("doctor_client", "/roles/doctor", 200),
        ("patient_client", "/roles/doctor", 403),
        ("admin_client", "/roles/doctor", 403),
        ("admin_client", "/roles/admin", 200),
        ("patient_client", "/roles/admin", 403),
        ("doctor_client", "/roles/admin", 403),
    ],
)
def test_role_endpoints_allow_and_deny(client_fixture: str, path: str, status_code: int, request):
    client: TestClient = request.getfixturevalue(client_fixture)
    response = client.get(path, headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == status_code
    if status_code == 200:
        assert response.json()["role"] == path.rsplit("/", 1)[-1]
    else:
        assert response.json()["detail"] == "Insufficient permissions"


def test_role_endpoint_requires_authentication(patient_client: TestClient):
    response = patient_client.get("/roles/patient")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authorization token"


def test_role_query_and_header_are_ignored(patient_client: TestClient):
    response = patient_client.get(
        "/roles/admin",
        headers={"Authorization": "Bearer valid-token", "X-Role": "admin"},
        params={"role": "admin"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions"


def test_require_roles_needs_at_least_one_role():
    with pytest.raises(ValueError, match="at least one role"):
        require_roles()
