from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ENUM, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AppRole

if TYPE_CHECKING:
    from app.models.patient import Patient


class Profile(Base):
    """Application user. firebase_uid is reserved for a later Firebase Auth phase."""

    __tablename__ = "profiles"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Unnamed")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(120), nullable=True)
    specialty: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    roles: Mapped[list["UserRole"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    patient: Mapped["Patient | None"] = relationship(back_populates="profile", uselist=False)


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[AppRole] = mapped_column(
        ENUM(AppRole, name="app_role", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    user: Mapped[Profile] = relationship(back_populates="roles")
