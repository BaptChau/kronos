# backend/app/services/clock_service.py
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.time_entry import TimeEntry


class ClockError(Exception):
    """Raised when a clock action cannot be performed."""


async def get_open_entry(
    db: AsyncSession, user_id: UUID, company_id: UUID
) -> TimeEntry | None:
    stmt = (
        select(TimeEntry)
        .where(
            TimeEntry.user_id == user_id,
            TimeEntry.company_id == company_id,
            TimeEntry.clocked_out_at.is_(None),
        )
        .order_by(TimeEntry.clocked_in_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def clock_in(
    db: AsyncSession, user_id: UUID, company_id: UUID, note: str | None = None
) -> TimeEntry:
    open_entry = await get_open_entry(db, user_id, company_id)
    if open_entry is not None:
        raise ClockError("user already has an open time entry")

    entry = TimeEntry(
        user_id=user_id,
        company_id=company_id,
        clocked_in_at=datetime.now(timezone.utc),
        note=note,
    )
    db.add(entry)
    try:
        await db.commit()
    except IntegrityError as exc:
        # uq_open_entry_per_user partial unique index closes the
        # TOCTOU window between get_open_entry and commit.
        await db.rollback()
        raise ClockError("user already has an open time entry") from exc
    await db.refresh(entry)
    return entry


async def clock_out(
    db: AsyncSession, user_id: UUID, company_id: UUID, note: str | None = None
) -> TimeEntry:
    entry = await get_open_entry(db, user_id, company_id)
    if entry is None:
        raise ClockError("no open time entry to close")

    now = datetime.now(timezone.utc)
    entry.clocked_out_at = now
    started = entry.clocked_in_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    delta_seconds = (now - started).total_seconds()
    entry.duration_minutes = max(0, round(delta_seconds / 60))
    if note is not None:
        entry.note = note

    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
