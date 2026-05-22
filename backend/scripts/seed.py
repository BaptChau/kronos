"""
Dev fixture loader. Idempotent — safe to run on every boot.

Creates:
  - 1 platform owner  (owner@kronos.dev / password)
  - 2 companies       (acme / techcorp)
  - 1 admin + 2 employees per company
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.company import Company
from app.models.time_entry import TimeEntry
from app.models.user import User, UserRole
from app.services.auth_service import hash_password


async def get_or_create_owner(session, email: str, full_name: str, password: str) -> User:
    result = await session.execute(
        select(User).where(User.email == email, User.role == UserRole.owner)
    )
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=UserRole.owner,
    )
    session.add(user)
    await session.flush()
    print(f"  created owner: {email}")
    return user


async def get_or_create_company(session, name: str, slug: str, frozen: bool) -> Company:
    result = await session.execute(select(Company).where(Company.slug == slug))
    company = result.scalar_one_or_none()
    if company:
        company.frozen = frozen  # Update frozen status if company already exists
        return company
    company = Company(name=name, slug=slug, frozen=frozen)
    session.add(company)
    await session.flush()
    print(f"  created company: {slug}")
    return company


async def get_or_create_user(
    session, company: Company, email: str, full_name: str, role: UserRole, password: str
) -> User:
    result = await session.execute(
        select(User).where(User.email == email, User.company_id == company.id)
    )
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(
        company_id=company.id,
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
    )
    session.add(user)
    await session.flush()
    print(f"  created {role.value}: {email}")
    return user


async def seed_time_entries(session, user: User, company: Company) -> None:
    result = await session.execute(
        select(TimeEntry).where(TimeEntry.user_id == user.id).limit(1)
    )
    if result.scalar_one_or_none():
        return
    now = datetime.now(timezone.utc)
    entries = [
        TimeEntry(
            user_id=user.id,
            company_id=company.id,
            clocked_in_at=now - timedelta(days=i, hours=8),
            clocked_out_at=now - timedelta(days=i),
            duration_minutes=420 + (i * 20) % 60,
            note=f"Dev fixture — day -{i}",
        )
        for i in range(1, 4)
    ]
    session.add_all(entries)
    print(f"  seeded {len(entries)} time entries for {user.email}")


async def seed() -> None:
    print("Seeding dev fixtures...")
    async with AsyncSessionLocal() as session:
        await get_or_create_owner(
            session,
            email="owner@kronos.dev",
            full_name="Platform Owner",
            password="password",
        )

        for company_name, slug, frozen in [("Acme Corp", "acme", False), ("TechCorp", "techcorp", False), ("Frozen Inc", "frozen", True)]:
            company = await get_or_create_company(session, company_name, slug, frozen)

            admin = await get_or_create_user(
                session, company,
                email=f"admin@{slug}.dev",
                full_name=f"{company_name} Admin",
                role=UserRole.admin,
                password="password",
            )
            for i in range(1, 3):
                employee = await get_or_create_user(
                    session, company,
                    email=f"employee{i}@{slug}.dev",
                    full_name=f"Employee {i} ({company_name})",
                    role=UserRole.employee,
                    password="password",
                )
                await seed_time_entries(session, employee, company)

        await session.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
