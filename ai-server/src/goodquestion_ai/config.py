from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",
        extra="ignore",
        populate_by_name=True,
    )

    openai_api_key: SecretStr = Field(validation_alias="OPENAI_API_KEY")
    internal_token: SecretStr = Field(validation_alias="AI_INTERNAL_TOKEN", min_length=16)
    openai_model: str = Field(default="gpt-5-mini", validation_alias="OPENAI_MODEL")
    openai_timeout_seconds: float = Field(
        default=5.0,
        gt=0,
        le=30,
        validation_alias="OPENAI_TIMEOUT_SECONDS",
    )
    openai_reasoning_effort: Literal["minimal", "low", "medium", "high"] = Field(
        default="minimal",
        validation_alias="OPENAI_REASONING_EFFORT",
    )
    analyze_max_output_tokens: int = Field(
        default=200,
        ge=100,
        le=800,
        validation_alias="ANALYZE_MAX_OUTPUT_TOKENS",
    )
    respond_max_output_tokens: int = Field(
        default=80,
        ge=50,
        le=300,
        validation_alias="RESPOND_MAX_OUTPUT_TOKENS",
    )
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")

@lru_cache
def get_settings() -> Settings:
    # Values are supplied by the environment at runtime.
    return Settings()  # type: ignore[call-arg]
