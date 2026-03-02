import hashlib
import hmac
import os

from fastapi import Header, HTTPException

MYDAILY_PASSWORD = os.getenv("MYDAILY_PASSWORD", "asd123123123")
SECRET_KEY = os.getenv("MYDAILY_SECRET_KEY", "mydaily-default-secret-key")


def generate_token(password: str) -> str:
    """Generate a deterministic auth token from password."""
    return hmac.new(SECRET_KEY.encode(), password.encode(), hashlib.sha256).hexdigest()


def verify_auth(authorization: str | None = Header(None, alias="Authorization")):
    """FastAPI dependency that verifies Bearer token on protected routes."""
    if not MYDAILY_PASSWORD:
        return  # Auth disabled when no password is configured
    expected = generate_token(MYDAILY_PASSWORD)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    if not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Invalid token")
