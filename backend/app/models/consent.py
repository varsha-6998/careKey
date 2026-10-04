from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ConsentStatus

if TYPE_CHECKING:
    from app.models.patient import Patient
    from app.models.profile import Profile


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    provider_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    permissions: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    purpose: Mapped[str] = mapped_column(String(64), nullable=False, default="Consultation")
    status: Mapped[ConsentStatus] = mapped_column(
        ENUM(ConsentStatus, name="consent_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ConsentStatus.PENDING,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="consents")
    provider: Mapped["Profile"] = relationship()
