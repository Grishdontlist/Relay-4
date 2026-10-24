import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    ConversationBinding,
    EvidenceVerificationStatus,
    Incident,
    IncidentEvidence,
    IncidentHistory,
    IncidentStatus,
    ProcessedToolEvent,
)
from app.schemas import IncidentCreate, IncidentPatch, WebhookToolPayload

TRACKED_FIELDS = (
    "incident_type",
    "description",
    "location",
    "landmark",
    "hazard",
    "people_count",
    "injuries",
    "location_confirmed",
)


@dataclass
class UpsertResult:
    incident: Incident
    created: bool
    duplicate: bool


def _payload_hash(payload: WebhookToolPayload) -> str:
    return hashlib.sha256(
        json.dumps(payload.model_dump(mode="json"), sort_keys=True).encode("utf-8")
    ).hexdigest()


def _stringify(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _record_changes(
    db: Session,
    incident: Incident,
    values: dict,
    *,
    source: str,
    actor_type: str,
    conversation_id: str | None = None,
    event_id: str | None = None,
) -> bool:
    changed = False
    for field_name in TRACKED_FIELDS:
        if field_name not in values:
            continue
        new_value = values[field_name]
        old_value = getattr(incident, field_name)
        if old_value == new_value:
            continue
        setattr(incident, field_name, new_value)
        db.add(
            IncidentHistory(
                incident_id=incident.id,
                field_name=field_name,
                previous_value=_stringify(old_value),
                new_value=_stringify(new_value),
                conversation_id=conversation_id,
                event_id=event_id,
                source=source,
                actor_type=actor_type,
            )
        )
        changed = True
    return changed


def create_manual_incident(db: Session, payload: IncidentCreate) -> Incident:
    incident = Incident(**payload.model_dump(exclude_unset=True), status=IncidentStatus.INTAKE)
    db.add(incident)
    db.flush()
    return incident


def update_manual_incident(db: Session, incident: Incident, payload: IncidentPatch) -> Incident:
    values = payload.model_dump(exclude_unset=True)
    status_value = values.pop("status", None)
    changed = _record_changes(db, incident, values, source="admin_api", actor_type="dispatcher")
    if status_value is not None and incident.status != status_value:
        db.add(
            IncidentHistory(
                incident_id=incident.id,
                field_name="status",
                previous_value=incident.status.value,
                new_value=status_value.value,
                source="admin_api",
                actor_type="dispatcher",
            )
        )
        incident.status = status_value
        changed = True
    if changed:
        db.flush()
    return incident


def upsert_from_webhook(db: Session, payload: WebhookToolPayload) -> UpsertResult:
    payload_hash = _payload_hash(payload)
    processed = db.get(ProcessedToolEvent, payload.event_id)
    if processed:
        if processed.payload_hash and processed.payload_hash != payload_hash:
            raise ValueError("event_id was already processed with a different payload")
        incident = db.get(Incident, processed.incident_id)
        if incident is None:
            raise ValueError("Processed event references a missing incident")
        return UpsertResult(incident=incident, created=False, duplicate=True)

    binding = db.get(ConversationBinding, payload.conversation_id)
    created = binding is None
    if binding:
        incident = db.get(Incident, binding.incident_id)
        if incident is None:
            raise ValueError("Conversation binding references a missing incident")
        binding.last_seen_at = datetime.now(timezone.utc)
    else:
        incident = Incident(
            conversation_id=payload.conversation_id,
            status=IncidentStatus.INTAKE,
        )
        db.add(incident)
        db.flush()
        binding = ConversationBinding(conversation_id=payload.conversation_id, incident_id=incident.id)
        db.add(binding)

    values = payload.model_dump(exclude_unset=True, exclude={"event_id", "conversation_id", "source_quote", "transcript_reference"})
    changed = _record_changes(
        db,
        incident,
        values,
        source="elevenlabs_webhook",
        actor_type="voice_agent",
        conversation_id=payload.conversation_id,
        event_id=payload.event_id,
    )

    if changed and not created and incident.status == IncidentStatus.REVIEWED:
        db.add(
            IncidentHistory(
                incident_id=incident.id,
                field_name="status",
                previous_value=IncidentStatus.REVIEWED.value,
                new_value=IncidentStatus.NEEDS_REVIEW.value,
                conversation_id=payload.conversation_id,
                event_id=payload.event_id,
                source="elevenlabs_webhook",
                actor_type="voice_agent",
            )
        )
        incident.status = IncidentStatus.NEEDS_REVIEW

    if payload.source_quote:
        db.add(
            IncidentEvidence(
                incident_id=incident.id,
                source_quote=payload.source_quote,
                transcript_reference=payload.transcript_reference,
                conversation_id=payload.conversation_id,
                event_id=payload.event_id,
                verification_status=EvidenceVerificationStatus.UNVERIFIED,
            )
        )

    db.add(
        ProcessedToolEvent(
            event_id=payload.event_id,
            conversation_id=payload.conversation_id,
            incident_id=incident.id,
            payload_hash=payload_hash,
        )
    )
    db.flush()
    return UpsertResult(incident=incident, created=created, duplicate=False)
