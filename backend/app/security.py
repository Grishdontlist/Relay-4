import hmac

from fastapi import HTTPException, Request, status


async def require_admin_api_key(request: Request) -> None:
    configured_key = request.app.state.settings.admin_api_key
    supplied_key = request.headers.get("X-Admin-API-Key", "")
    if not configured_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin authentication is not configured")
    if not supplied_key or not hmac.compare_digest(supplied_key, configured_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")


async def require_webhook_secret(request: Request) -> None:
    configured_secret = request.app.state.settings.elevenlabs_webhook_secret
    header_name = request.app.state.settings.elevenlabs_webhook_header
    supplied_secret = request.headers.get(header_name, "")
    if not configured_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Webhook authentication is not configured")
    if not supplied_secret or not hmac.compare_digest(supplied_secret, configured_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook credentials")
