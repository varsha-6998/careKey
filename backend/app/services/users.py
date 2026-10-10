"""Application user lookup and Firebase identity bootstrap."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.firebase import FirebaseIdentity
from app.models.enums import AppRole
from app.models.user import User

DEFAULT_BOOTSTRAP_ROLE = AppRole.PATIENT


def get_or_create_user_from_identity(db: Session, identity: FirebaseIdentity) -> User:
    """Load the user for a verified Firebase uid, or create a patient record.

    Email is taken from the verified token. Role is never accepted from the client.
    """
    user = db.scalar(select(User).where(User.firebase_uid == identity.firebase_uid))
    if user is None:
        user = User(
            firebase_uid=identity.firebase_uid,
            email=identity.email,
            is_active=True,
            role=DEFAULT_BOOTSTRAP_ROLE,
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            user = db.scalar(select(User).where(User.firebase_uid == identity.firebase_uid))
            if user is None:
                raise
        else:
            db.refresh(user)
            return user

    if identity.email and user.email != identity.email:
        user.email = identity.email
        db.commit()
        db.refresh(user)

    return user
