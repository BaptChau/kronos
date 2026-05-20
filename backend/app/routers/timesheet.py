# backend/app/routers/timesheet.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.time_entry import TimeEntryRead, WeeklySummary
from app.services.timesheet_service import (
    TimesheetError,
    build_weekly_summary,
    list_entries_for_week,
)

router = APIRouter(prefix="/api/v1/timesheet", tags=["timesheet"])


@router.get("/me", response_model=list[TimeEntryRead])
async def my_entries(
    week: str = Query(..., description="ISO week, format YYYY-Www"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TimeEntryRead]:
    try:
        entries = await list_entries_for_week(db, current_user.id, current_user.company_id, week)
    except TimesheetError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return [TimeEntryRead.model_validate(entry) for entry in entries]


@router.get("/me/summary", response_model=WeeklySummary)
async def my_summary(
    week: str = Query(..., description="ISO week, format YYYY-Www"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WeeklySummary:
    try:
        entries = await list_entries_for_week(db, current_user.id, current_user.company_id, week)
        summary = build_weekly_summary(week, entries)
    except TimesheetError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return WeeklySummary(**summary)
