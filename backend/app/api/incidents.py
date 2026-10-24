from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident, IncidentHistory
from app.schemas import IncidentCreate, IncidentDetail, IncidentPatch, IncidentRead, HistoryRead
from app.security import require_admin_api_key
from app.services.incident_service import create_manual_incident, update_manual_incident

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("", response_model=IncidentRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin_api_key)])
async def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    incident = create_manual_incident(db, payload)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("", response_model=list[IncidentRead])
async def list_incidents(db: Session = Depends(get_db)):
    return list(db.scalars(select(Incident).order_by(Incident.created_at.desc())).all())


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(incident_id: UUID, db: Session = Depends(get_db)):
    incident = db.get(Incident, str(incident_id))
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}", response_model=IncidentRead, dependencies=[Depends(require_admin_api_key)])
async def update_incident(incident_id: UUID, payload: IncidentPatch, db: Session = Depends(get_db)):
    incident = db.get(Incident, str(incident_id))
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    update_manual_incident(db, incident, payload)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/{incident_id}/history", response_model=list[HistoryRead])
async def get_incident_history(incident_id: UUID, db: Session = Depends(get_db)):
    if db.get(Incident, str(incident_id)) is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return list(
        db.scalars(
            select(IncidentHistory)
            .where(IncidentHistory.incident_id == str(incident_id))
            .order_by(IncidentHistory.changed_at.asc())
        ).all()
    )
