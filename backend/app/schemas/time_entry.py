# backend/app/schemas/time_entry.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TimeEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    company_id: UUID
    clocked_in_at: datetime
    clocked_out_at: datetime | None
    duration_minutes: int | None
    note: str | None


class ClockInRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class ClockOutRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class ClockStatusResponse(BaseModel):
    open_entry: TimeEntryRead | None


class TimeEntryUpdate(BaseModel):
    clocked_in_at: datetime | None = None
    clocked_out_at: datetime | None = None
    note: str | None = Field(default=None, max_length=1000)


class WeeklySummary(BaseModel):
    week: str
    total_minutes: int
    minutes_by_day: dict[str, int]
