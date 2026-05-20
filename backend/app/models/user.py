# backend/app/models/user.py
from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel


class UserRole(str, Enum):
    employee = "employee"
    admin = "admin"


class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("company_id", "email", name="uq_users_company_email"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    company_id: UUID = Field(foreign_key="companies.id", index=True, nullable=False)
    email: str = Field(nullable=False, max_length=255, index=True)
    hashed_password: str = Field(nullable=False, max_length=255)
    full_name: str = Field(nullable=False, max_length=255)
    role: UserRole = Field(default=UserRole.employee, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
