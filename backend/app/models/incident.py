from datetime import datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IncidentStatus(str, Enum):
    INTAKE = "intake"
    NEEDS_REVIEW = "needs_review"
    REVIEWED = "reviewed"


class EvidenceVerificationStatus(str, Enum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    incident_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    landmark: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hazard: Mapped[str | None] = mapped_column(String(255), nullable=True)
    people_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    injuries: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[IncidentStatus] = mapped_column(
        SqlEnum(IncidentStatus, native_enum=False),
        nullable=False,
        default=IncidentStatus.INTAKE,
    )
    conversation_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    history: Mapped[list["IncidentHistory"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="IncidentHistory.changed_at"
    )
    evidence: Mapped[list["IncidentEvidence"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="IncidentEvidence.created_at"
    )


class IncidentHistory(Base):
    __tablename__ = "incident_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    previous_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    incident: Mapped[Incident] = relationship(back_populates="history")


class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    source_quote: Mapped[str] = mapped_column(Text, nullable=False)
    transcript_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verification_status: Mapped[EvidenceVerificationStatus] = mapped_column(
        SqlEnum(EvidenceVerificationStatus, native_enum=False),
        nullable=False,
        default=EvidenceVerificationStatus.UNVERIFIED,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    incident: Mapped[Incident] = relationship(back_populates="evidence")


class ProcessedToolEvent(Base):
    __tablename__ = "processed_tool_events"

    event_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    incident_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    payload_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ConversationBinding(Base):
    __tablename__ = "conversation_bindings"
    __table_args__ = (UniqueConstraint("conversation_id", name="uq_conversation_binding_conversation_id"),)

    conversation_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    incident_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
