# backend/app/models/company.py
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class Company(SQLModel, table=True):
    __tablename__ = "companies"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(nullable=False, max_length=255)
    slug: str = Field(nullable=False, max_length=100, unique=True, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    frozen: bool = Field(default=False, nullable=False)
