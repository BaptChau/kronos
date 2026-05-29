# backend/app/config.py
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(alias="DATABASE_URL")
    alembic_database_url: str = Field(alias="ALEMBIC_DATABASE_URL")
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")

    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=1440, alias="JWT_EXPIRE_MINUTES")

    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    app_env: str = Field(default="production", alias="APP_ENV")

    @model_validator(mode="after")
    def _refuse_placeholder_secrets_in_prod(self) -> "Settings":
        if self.app_env == "production" and self.jwt_secret_key.startswith("please-change"):
            raise ValueError(
                "JWT_SECRET_KEY is set to a placeholder. Generate one with "
                "`openssl rand -hex 32` before booting in production."
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
