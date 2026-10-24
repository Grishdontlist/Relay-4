from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import WebhookResponse, WebhookToolPayload
from app.security import require_webhook_secret
from app.services.incident_service import upsert_from_webhook

router = APIRouter(prefix="/api/elevenlabs/tools", tags=["elevenlabs"])


@router.post(
    "/upsert-incident",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_webhook_secret)],
)
async def upsert_incident(payload: WebhookToolPayload, db: Session = Depends(get_db)):
    try:
        result = upsert_from_webhook(db, payload)
        db.commit()
        db.refresh(result.incident)
    except IntegrityError:
        db.rollback()
        # A concurrent retry may have committed this event after the initial lookup.
        result = upsert_from_webhook(db, payload)
        db.commit()
        db.refresh(result.incident)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return WebhookResponse(
        event_id=payload.event_id,
        incident_id=result.incident.id,
        status=result.incident.status,
        created=result.created,
        duplicate=result.duplicate,
    )
