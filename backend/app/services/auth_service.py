# backend/app/services/auth_service.py
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: UUID, company_id: UUID, role: str) -> tuple[str, int]:
    expires_in = settings.jwt_expire_minutes * 60
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "company_id": str(company_id),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("invalid token") from exc


async def get_user_by_email_and_company(
    db: AsyncSession, email: str, company_id: UUID
) -> User | None:
    stmt = select(User).where(User.email == email, User.company_id == company_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_email_any_company(db: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    return await db.get(User, user_id)


async def get_company_by_slug(db: AsyncSession, slug: str) -> Company | None:
    stmt = select(Company).where(Company.slug == slug)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def register_company_and_admin(
    db: AsyncSession, payload: RegisterRequest
) -> tuple[Company, User]:
    existing = await get_company_by_slug(db, payload.company_slug)
    if existing is not None:
        raise ValueError("company slug already in use")

    company = Company(name=payload.company_name, slug=payload.company_slug)
    db.add(company)
    await db.flush()

    admin = User(
        company_id=company.id,
        email=payload.admin_email.lower(),
        hashed_password=hash_password(payload.admin_password),
        full_name=payload.admin_full_name,
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(company)
    await db.refresh(admin)
    return company, admin


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email_any_company(db, email.lower())
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
