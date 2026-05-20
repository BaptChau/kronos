# backend/app/models/time_entry.py
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class TimeEntry(SQLModel, table=True):
    __tablename__ = "time_entries"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True, nullable=False)
    company_id: UUID = Field(foreign_key="companies.id", index=True, nullable=False)
    clocked_in_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    clocked_out_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    duration_minutes: int | None = Field(default=None, nullable=True)
    note: str | None = Field(default=None, max_length=1000, nullable=True)
