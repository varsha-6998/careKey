from app.models import (
    AccessLog,
    Allergy,
    Consent,
    Hospital,
    Medication,
    Patient,
    Profile,
    UserRole,
)
from app.utils.ids import generate_medical_id


def test_health_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "carekey-api"


def test_openapi_available(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "paths" in response.json()
    assert "/health" in response.json()["paths"]


def test_medical_id_format():
    medical_id = generate_medical_id()
    assert medical_id.startswith("CK-")
    assert len(medical_id) == 11
    assert medical_id[3:].isalnum()
    assert medical_id[3:].isupper() or any(ch.isdigit() for ch in medical_id[3:])


def test_model_table_names():
    assert Profile.__tablename__ == "profiles"
    assert UserRole.__tablename__ == "user_roles"
    assert Patient.__tablename__ == "patients"
    assert Allergy.__tablename__ == "allergies"
    assert Medication.__tablename__ == "medications"
    assert Consent.__tablename__ == "consents"
    assert AccessLog.__tablename__ == "access_logs"
    assert Hospital.__tablename__ == "hospitals"


def test_unknown_route_is_json_404(client):
    response = client.get("/this-route-does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert body["status_code"] == 404
    assert "detail" in body
