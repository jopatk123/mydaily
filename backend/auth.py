import hashlib
import hmac
import logging
import os
import threading
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)

MYDAILY_PASSWORD = os.getenv("MYDAILY_PASSWORD", "asd123123123")
SECRET_KEY = os.getenv("MYDAILY_SECRET_KEY", "mydaily-default-secret-key")

if MYDAILY_PASSWORD == "asd123123123":
    logger.warning(
        "SECURITY WARNING: Using default password. "
        "Set the MYDAILY_PASSWORD environment variable to a strong password."
    )
if SECRET_KEY == "mydaily-default-secret-key":
    logger.warning(
        "SECURITY WARNING: Using default SECRET_KEY. "
        "Set the MYDAILY_SECRET_KEY environment variable to a random string."
    )


class _LoginRateLimiter:
    """Simple in-memory rate limiter for login attempts, keyed by client IP."""

    def __init__(self, max_attempts: int = 10, window_seconds: int = 60):
        self._max = max_attempts
        self._window = window_seconds
        self._data: Dict[str, List[datetime]] = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        """Return True if the key is within the rate limit, False if blocked."""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=self._window)
        with self._lock:
            self._data[key] = [t for t in self._data[key] if t > cutoff]
            if len(self._data[key]) >= self._max:
                return False
            self._data[key].append(now)
            return True

    def reset(self, key: str | None = None) -> None:
        """Clear rate-limit state. Pass a key to clear only that key, or omit to clear all."""
        with self._lock:
            if key is None:
                self._data.clear()
            else:
                self._data.pop(key, None)


login_limiter = _LoginRateLimiter(max_attempts=10, window_seconds=60)


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
