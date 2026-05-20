# backend/app/schemas/owner.py
from pydantic import BaseModel, EmailStr, Field


class CreateCompanyRequest(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    company_slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9-]*$")
    admin_email: EmailStr
    admin_password: str = Field(min_length=8, max_length=128)
    admin_full_name: str = Field(min_length=1, max_length=255)


class CreateAdminRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class CreateOwnerRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
