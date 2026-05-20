# backend/app/routers/owner.py
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_owner
from app.models.user import User
from app.schemas.company import CompanyRead
from app.schemas.owner import (
    CreateAdminRequest,
    CreateCompanyRequest,
    CreateOwnerRequest,
)
from app.schemas.user import UserRead
from app.services.owner_service import (
    OwnerError,
    create_company_admin,
    create_company_with_admin,
    create_owner,
    get_company,
    list_companies,
    list_company_users,
)

router = APIRouter(prefix="/api/v1/owner", tags=["owner"])


@router.get("/companies", response_model=list[CompanyRead])
async def get_companies(
    _: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
) -> list[CompanyRead]:
    companies = await list_companies(db)
    return [CompanyRead.model_validate(c) for c in companies]


@router.post("/companies", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
async def post_company(
    payload: CreateCompanyRequest,
    _: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
) -> CompanyRead:
    try:
        company, _admin = await create_company_with_admin(
            db,
            company_name=payload.company_name,
            company_slug=payload.company_slug,
            admin_email=payload.admin_email,
            admin_password=payload.admin_password,
            admin_full_name=payload.admin_full_name,
        )
    except OwnerError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return CompanyRead.model_validate(company)


async def _ensure_company(db: AsyncSession, company_id: UUID):
    company = await get_company(db, company_id)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="company not found"
        )
    return company


@router.get("/companies/{company_id}/users", response_model=list[UserRead])
async def get_company_users(
    company_id: UUID,
    _: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
) -> list[UserRead]:
    await _ensure_company(db, company_id)
    users = await list_company_users(db, company_id)
    return [UserRead.model_validate(u) for u in users]


@router.post(
    "/companies/{company_id}/admins",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_company_admin(
    company_id: UUID,
    payload: CreateAdminRequest,
    _: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    await _ensure_company(db, company_id)
    try:
        user = await create_company_admin(
            db,
            company_id=company_id,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
        )
    except OwnerError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return UserRead.model_validate(user)


@router.post("/owners", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def post_owner(
    payload: CreateOwnerRequest,
    _: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    try:
        owner = await create_owner(
            db,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
        )
    except OwnerError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return UserRead.model_validate(owner)
