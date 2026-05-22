"""add_company_frozen

Revision ID: 9ef3df611a63
Revises: 0002_owner_role
Create Date: 2026-05-22 19:00:17.157784

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = '9ef3df611a63'
down_revision: Union[str, None] = '0002_owner_role'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('companies', sa.Column('frozen', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('companies', 'frozen')
