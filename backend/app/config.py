from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    api_port: int = 8000
    database_url: str = "sqlite:///./relay4.db"
    elevenlabs_agent_id: str | None = None
    elevenlabs_webhook_secret: str = Field(default="", repr=False)
    elevenlabs_webhook_header: str = "X-ElevenLabs-Webhook-Secret"
    admin_api_key: str = Field(default="", repr=False)
    simulation_mode: bool = True
    cors_origins: str = ""

    @property
    def configured_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
