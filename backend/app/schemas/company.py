# backend/app/schemas/company.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    created_at: datetime
