"""Add is_active flag to application users.

Revision ID: 0003_user_is_active
Revises: 0002_users
Create Date: 2026-10-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_user_is_active"
down_revision: Union[str, Sequence[str], None] = "0002_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
    )
    op.execute("UPDATE users SET is_active = true WHERE is_active IS NULL")
    op.alter_column(
        "users",
        "is_active",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("true"),
    )


def downgrade() -> None:
    op.drop_column("users", "is_active")
