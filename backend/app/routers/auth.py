# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import clear_auth_cookie, get_current_user, set_auth_cookie
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserRead
from app.services.auth_service import (
    authenticate,
    create_access_token,
    register_company_and_admin,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        _, admin = await register_company_and_admin(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    token, _ = create_access_token(admin.id, admin.company_id, admin.role.value)
    set_auth_cookie(response, token)
    return admin


@router.post("/login", response_model=UserRead)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid email or password",
        )
    if user.company_id and user.role == UserRole.admin:
        company = await db.get(Company, user.company_id)
        if company and company.frozen:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="company is frozen please contact support",
            )

    token, _ = create_access_token(user.id, user.company_id, user.role.value)
    set_auth_cookie(response, token)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> Response:
    clear_auth_cookie(response)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
