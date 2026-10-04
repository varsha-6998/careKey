from enum import StrEnum


class AppRole(StrEnum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class ConsentStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    REJECTED = "rejected"
