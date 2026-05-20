"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-20 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_companies_slug", "companies", ["slug"], unique=True)

    user_role_enum = postgresql.ENUM("employee", "admin", name="userrole", create_type=True)
    user_role_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM("employee", "admin", name="userrole", create_type=False),
            nullable=False,
            server_default="employee",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("company_id", "email", name="uq_users_company_email"),
    )
    op.create_index("ix_users_company_id", "users", ["company_id"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "time_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("clocked_in_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("clocked_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("note", sa.String(length=1000), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_time_entries_user_id", "time_entries", ["user_id"])
    op.create_index("ix_time_entries_company_id", "time_entries", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_time_entries_company_id", table_name="time_entries")
    op.drop_index("ix_time_entries_user_id", table_name="time_entries")
    op.drop_table("time_entries")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_company_id", table_name="users")
    op.drop_table("users")

    user_role_enum = postgresql.ENUM("employee", "admin", name="userrole")
    user_role_enum.drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_companies_slug", table_name="companies")
    op.drop_table("companies")
