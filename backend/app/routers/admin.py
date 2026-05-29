# backend/app/routers/admin.py
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_active_admin, require_admin
from app.models.user import User
from app.schemas.time_entry import TimeEntryRead, TimeEntryUpdate, WeeklySummary
from app.schemas.user import UserCreate, UserRead, UserWithStatus
from app.services.auth_service import (
    get_user_by_email_and_company,
    hash_password,
)
from app.services.clock_service import get_open_entry
from app.services.timesheet_service import (
    TimesheetError,
    build_weekly_summary,
    get_entry,
    list_entries_for_week,
    update_entry,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/users", response_model=list[UserWithStatus])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UserWithStatus]:
    stmt = (
        select(User)
        .where(User.company_id == admin.company_id)
        .order_by(User.created_at.asc())
    )
    result = await db.execute(stmt)
    users = list(result.scalars().all())

    response: list[UserWithStatus] = []
    for user in users:
        open_entry = await get_open_entry(db, user.id, admin.company_id)
        response.append(
            UserWithStatus(
                **UserRead.model_validate(user).model_dump(),
                has_open_entry=open_entry is not None,
                current_clock_in=open_entry.clocked_in_at if open_entry else None,
            )
        )
    return response


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    admin: User = Depends(require_active_admin),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    existing = await get_user_by_email_and_company(
        db, payload.email.lower(), admin.company_id
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="user with this email already exists in this company",
        )

    user = User(
        company_id=admin.company_id,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


async def _ensure_user_in_company(
    db: AsyncSession, user_id: UUID, company_id: UUID
) -> User:
    stmt = select(User).where(User.id == user_id, User.company_id == company_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="user not found in this company",
        )
    return user


@router.get("/users/{user_id}/timesheet", response_model=list[TimeEntryRead])
async def user_timesheet(
    user_id: UUID,
    week: str = Query(..., description="ISO week, format YYYY-Www"),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[TimeEntryRead]:
    await _ensure_user_in_company(db, user_id, admin.company_id)
    try:
        entries = await list_entries_for_week(db, user_id, admin.company_id, week)
    except TimesheetError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return [TimeEntryRead.model_validate(entry) for entry in entries]


@router.get("/users/{user_id}/summary", response_model=WeeklySummary)
async def user_summary(
    user_id: UUID,
    week: str = Query(..., description="ISO week, format YYYY-Www"),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> WeeklySummary:
    await _ensure_user_in_company(db, user_id, admin.company_id)
    try:
        entries = await list_entries_for_week(db, user_id, admin.company_id, week)
        summary = build_weekly_summary(week, entries)
    except TimesheetError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return WeeklySummary(**summary)


@router.patch("/time-entries/{entry_id}", response_model=TimeEntryRead)
async def patch_entry(
    entry_id: UUID,
    payload: TimeEntryUpdate,
    admin: User = Depends(require_active_admin),
    db: AsyncSession = Depends(get_db),
) -> TimeEntryRead:
    entry = await get_entry(db, entry_id, admin.company_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="time entry not found in this company",
        )
    try:
        updated = await update_entry(
            db,
            entry,
            clocked_in_at=payload.clocked_in_at,
            clocked_out_at=payload.clocked_out_at,
            note=payload.note,
        )
    except TimesheetError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return TimeEntryRead.model_validate(updated)
