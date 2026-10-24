from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import EvidenceVerificationStatus, IncidentStatus


class IncidentFields(BaseModel):
    incident_type: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=10000)
    location: str | None = Field(default=None, max_length=500)
    landmark: str | None = Field(default=None, max_length=255)
    hazard: str | None = Field(default=None, max_length=255)
    people_count: int | None = Field(default=None, ge=0, le=100000)
    injuries: str | None = Field(default=None, max_length=5000)
    location_confirmed: bool | None = None


class IncidentCreate(IncidentFields):
    pass


class IncidentPatch(IncidentFields):
    status: IncidentStatus | None = None


class WebhookToolPayload(IncidentFields):
    event_id: str = Field(min_length=1, max_length=255)
    conversation_id: str = Field(min_length=1, max_length=255)
    source_quote: str | None = Field(default=None, max_length=10000)
    transcript_reference: str | None = Field(default=None, max_length=500)

    @field_validator("event_id", "conversation_id")
    @classmethod
    def non_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value.strip()


class HistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    field_name: str
    previous_value: str | None
    new_value: str | None
    conversation_id: str | None
    event_id: str | None
    source: str
    actor_type: str
    changed_at: datetime


class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_quote: str
    transcript_reference: str | None
    conversation_id: str | None
    event_id: str | None
    verification_status: EvidenceVerificationStatus
    created_at: datetime


class IncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_type: str | None
    description: str | None
    location: str | None
    landmark: str | None
    hazard: str | None
    people_count: int | None
    injuries: str | None
    location_confirmed: bool
    status: IncidentStatus
    conversation_id: str | None
    created_at: datetime
    updated_at: datetime


class IncidentDetail(IncidentRead):
    history: list[HistoryRead]
    evidence: list[EvidenceRead]


class WebhookResponse(BaseModel):
    event_id: str
    incident_id: UUID
    status: IncidentStatus
    created: bool
    duplicate: bool
