# backend/app/services/owner_service.py
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.user import User, UserRole
from app.services.auth_service import (
    get_company_by_slug,
    get_user_by_email_and_company,
    get_owner_by_email,
    hash_password,
)


class OwnerError(Exception):
    """Raised when an owner action cannot be performed."""


async def list_companies(db: AsyncSession) -> list[Company]:
    stmt = select(Company).order_by(Company.created_at.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_company(db: AsyncSession, company_id: UUID) -> Company | None:
    return await db.get(Company, company_id)


async def create_company_with_admin(
    db: AsyncSession,
    *,
    company_name: str,
    company_slug: str,
    admin_email: str,
    admin_password: str,
    admin_full_name: str,
) -> tuple[Company, User]:
    existing = await get_company_by_slug(db, company_slug)
    if existing is not None:
        raise OwnerError("company slug already in use")

    company = Company(name=company_name, slug=company_slug)
    db.add(company)
    await db.flush()

    admin = User(
        company_id=company.id,
        email=admin_email.lower(),
        hashed_password=hash_password(admin_password),
        full_name=admin_full_name,
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(company)
    await db.refresh(admin)
    return company, admin


async def list_company_users(db: AsyncSession, company_id: UUID) -> list[User]:
    stmt = (
        select(User)
        .where(User.company_id == company_id)
        .order_by(User.created_at.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_company_admin(
    db: AsyncSession,
    *,
    company_id: UUID,
    email: str,
    password: str,
    full_name: str,
) -> User:
    normalized = email.lower()
    existing = await get_user_by_email_and_company(db, normalized, company_id)
    if existing is not None:
        raise OwnerError("user with this email already exists in this company")

    user = User(
        company_id=company_id,
        email=normalized,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=UserRole.admin,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def create_owner(
    db: AsyncSession, *, email: str, password: str, full_name: str
) -> User:
    normalized = email.lower()
    existing = await get_owner_by_email(db, normalized)
    if existing is not None:
        raise OwnerError("an owner with this email already exists")

    owner = User(
        company_id=None,
        email=normalized,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=UserRole.owner,
        is_active=True,
    )
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner

async def get_frozen_company_ids(db) -> set:
    result = await db.execute(
        "SELECT id FROM companies WHERE frozen = true"
    )
    return {row[0] for row in result.fetchall()}

async def freeze_company(db, company_id):
    await db.execute(
        "UPDATE companies SET frozen = true WHERE id = :company_id",
        {"company_id": company_id},
    )
    await db.commit()

async def unfreeze_company(db, company_id):
    await db.execute(
        "UPDATE companies SET frozen = false WHERE id = :company_id",
        {"company_id": company_id},
    )
    await db.commit()