# backend/app/services/timesheet_service.py
from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.time_entry import TimeEntry

ISO_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class TimesheetError(Exception):
    """Raised when timesheet inputs are invalid."""


def parse_iso_week(week: str) -> tuple[int, int]:
    try:
        year_str, week_str = week.split("-W")
        year = int(year_str)
        week_num = int(week_str)
    except ValueError as exc:
        raise TimesheetError("invalid week format, expected YYYY-Www") from exc
    if not 1 <= week_num <= 53:
        raise TimesheetError("invalid ISO week number")
    return year, week_num


def iso_week_bounds(week: str) -> tuple[datetime, datetime]:
    year, week_num = parse_iso_week(week)
    try:
        monday = date.fromisocalendar(year, week_num, 1)
    except ValueError as exc:
        raise TimesheetError("invalid ISO week") from exc
    sunday_next = monday + timedelta(days=7)
    start = datetime.combine(monday, time.min, tzinfo=timezone.utc)
    end = datetime.combine(sunday_next, time.min, tzinfo=timezone.utc)
    return start, end


async def list_entries_for_week(
    db: AsyncSession, user_id: UUID, company_id: UUID, week: str
) -> list[TimeEntry]:
    start, end = iso_week_bounds(week)
    stmt = (
        select(TimeEntry)
        .where(
            TimeEntry.user_id == user_id,
            TimeEntry.company_id == company_id,
            TimeEntry.clocked_in_at >= start,
            TimeEntry.clocked_in_at < end,
        )
        .order_by(TimeEntry.clocked_in_at.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


def _minutes_for_entry(entry: TimeEntry) -> int:
    if entry.duration_minutes is not None:
        return entry.duration_minutes
    if entry.clocked_out_at is None:
        return 0
    started = entry.clocked_in_at
    ended = entry.clocked_out_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    if ended.tzinfo is None:
        ended = ended.replace(tzinfo=timezone.utc)
    return max(0, round((ended - started).total_seconds() / 60))


def build_weekly_summary(week: str, entries: list[TimeEntry]) -> dict:
    minutes_by_day = {label: 0 for label in ISO_WEEKDAYS}
    total = 0
    for entry in entries:
        clocked = entry.clocked_in_at
        if clocked.tzinfo is None:
            clocked = clocked.replace(tzinfo=timezone.utc)
        weekday_label = ISO_WEEKDAYS[clocked.isoweekday() - 1]
        minutes = _minutes_for_entry(entry)
        minutes_by_day[weekday_label] += minutes
        total += minutes
    return {
        "week": week,
        "total_minutes": total,
        "minutes_by_day": minutes_by_day,
    }


async def get_entry(
    db: AsyncSession, entry_id: UUID, company_id: UUID
) -> TimeEntry | None:
    stmt = select(TimeEntry).where(
        TimeEntry.id == entry_id,
        TimeEntry.company_id == company_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_entry(
    db: AsyncSession,
    entry: TimeEntry,
    clocked_in_at: datetime | None,
    clocked_out_at: datetime | None,
    note: str | None,
) -> TimeEntry:
    if clocked_in_at is not None:
        entry.clocked_in_at = clocked_in_at
    if clocked_out_at is not None:
        entry.clocked_out_at = clocked_out_at
    if note is not None:
        entry.note = note

    if entry.clocked_out_at is not None:
        started = entry.clocked_in_at
        ended = entry.clocked_out_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        if ended.tzinfo is None:
            ended = ended.replace(tzinfo=timezone.utc)
        if ended < started:
            raise TimesheetError("clocked_out_at must be after clocked_in_at")
        entry.duration_minutes = max(0, round((ended - started).total_seconds() / 60))
    else:
        entry.duration_minutes = None

    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
