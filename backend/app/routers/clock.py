# backend/app/routers/clock.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.time_entry import (
    ClockInRequest,
    ClockOutRequest,
    ClockStatusResponse,
    TimeEntryRead,
)
from app.services.clock_service import ClockError, clock_in, clock_out, get_open_entry

router = APIRouter(prefix="/api/v1/clock", tags=["clock"])


@router.post("/in", response_model=TimeEntryRead, status_code=status.HTTP_201_CREATED)
async def post_clock_in(
    payload: ClockInRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TimeEntryRead:
    note = payload.note if payload else None
    try:
        entry = await clock_in(db, current_user.id, current_user.company_id, note=note)
    except ClockError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return TimeEntryRead.model_validate(entry)


@router.post("/out", response_model=TimeEntryRead)
async def post_clock_out(
    payload: ClockOutRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TimeEntryRead:
    note = payload.note if payload else None
    try:
        entry = await clock_out(db, current_user.id, current_user.company_id, note=note)
    except ClockError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return TimeEntryRead.model_validate(entry)


@router.get("/status", response_model=ClockStatusResponse)
async def get_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClockStatusResponse:
    entry = await get_open_entry(db, current_user.id, current_user.company_id)
    return ClockStatusResponse(
        open_entry=TimeEntryRead.model_validate(entry) if entry else None
    )
