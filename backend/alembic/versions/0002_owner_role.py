"""owner role and nullable company_id

Revision ID: 0002_owner_role
Revises: 0001_initial
Create Date: 2026-05-20 00:00:01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_owner_role"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'owner'")
    op.alter_column("users", "company_id", existing_type=sa.dialects.postgresql.UUID(), nullable=True)
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_owner "
        "ON users (email) WHERE company_id IS NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_email_owner")
    op.execute("DELETE FROM users WHERE company_id IS NULL")
    op.alter_column(
        "users", "company_id", existing_type=sa.dialects.postgresql.UUID(), nullable=False
    )
