"""add_open_entry_unique_index

Revision ID: b2a7c4e8d1f3
Revises: 9ef3df611a63
Create Date: 2026-05-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b2a7c4e8d1f3"
down_revision: Union[str, None] = "9ef3df611a63"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE UNIQUE INDEX uq_open_entry_per_user "
        "ON time_entries(user_id, company_id) "
        "WHERE clocked_out_at IS NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_open_entry_per_user")
