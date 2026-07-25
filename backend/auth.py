import hashlib
import hmac
import logging
import os
import threading
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)

# 默认密码仅用于本地开发快速启动；生产必须通过环境变量覆盖
MYDAILY_PASSWORD = os.getenv("MYDAILY_PASSWORD", "asd123123123")
SECRET_KEY = os.getenv("MYDAILY_SECRET_KEY", "mydaily-default-secret-key")

# Token 默认有效期 30 天，与前端 localStorage 保持一致
TOKEN_TTL_SECONDS = int(os.getenv("MYDAILY_TOKEN_TTL_SECONDS", str(30 * 24 * 60 * 60)))

# 显式禁用认证（仅当密码为空且设为 true 时才允许放行）
AUTH_DISABLED = os.getenv("MYDAILY_AUTH_DISABLED", "").lower() in ("1", "true", "yes")

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

if not MYDAILY_PASSWORD and not AUTH_DISABLED:
    raise RuntimeError(
        "MYDAILY_PASSWORD is empty. Either set a strong password, "
        "or explicitly set MYDAILY_AUTH_DISABLED=true to disable auth."
    )


class _LoginRateLimiter:
    """Simple in-memory rate limiter for login attempts, keyed by client IP."""

    def __init__(self, max_attempts: int = 10, window_seconds: int = 60):
        self._max = max_attempts
        self._window = window_seconds
        self._data: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        """Return True if the key is within the rate limit, False if blocked."""
        now = time.time()
        cutoff = now - self._window
        with self._lock:
            self._data[key] = [t for t in self._data[key] if t > cutoff]
            # 顺带清理其他 IP 的过期窗口，避免长期不活跃 IP 残留造成内存泄漏
            if len(self._data) > 4096:
                stale = [k for k, v in self._data.items() if not v or v[-1] <= cutoff]
                for k in stale:
                    self._data.pop(k, None)
            if len(self._data[key]) >= self._max:
                return False
            self._data[key].append(now)
            return True

    def reset(self, key: Optional[str] = None) -> None:
        """Clear rate-limit state. Pass a key to clear only that key, or omit to clear all."""
        with self._lock:
            if key is None:
                self._data.clear()
            else:
                self._data.pop(key, None)


login_limiter = _LoginRateLimiter(max_attempts=10, window_seconds=60)


def generate_token(password: str, ttl_seconds: Optional[int] = None) -> str:
    """Generate an auth token carrying an expiry timestamp.

    格式: ``{exp_timestamp}.{hmac_hex}``，签名内容为 ``password:exp_timestamp``，
    服务端在 verify 时会校验 exp_timestamp 是否已过期。
    """
    if ttl_seconds is None:
        ttl_seconds = TOKEN_TTL_SECONDS
    exp_ts = int(time.time()) + ttl_seconds
    payload = f"{password}:{exp_ts}".encode()
    sig = hmac.new(SECRET_KEY.encode(), payload, hashlib.sha256).hexdigest()
    return f"{exp_ts}.{sig}"


def _parse_token(token: str) -> Tuple[int, str]:
    """Split a token into (exp_timestamp, signature_hex). Raise on malformed input."""
    try:
        exp_str, sig = token.split(".", 1)
        return int(exp_str), sig
    except (ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Malformed token")


def verify_auth(authorization: Optional[str] = Header(None, alias="Authorization")):
    """FastAPI dependency that verifies Bearer token on protected routes.

    Token 必须包含未过期的 exp_timestamp，且签名匹配 SECRET_KEY + MYDAILY_PASSWORD。
    """
    if not MYDAILY_PASSWORD:
        # 密码为空时已由启动校验保证必须显式 AUTH_DISABLED=true
        if AUTH_DISABLED:
            return
        # 此分支理论上不可达，防御性处理
        raise HTTPException(status_code=401, detail="Authentication not configured")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    exp_ts, sig = _parse_token(token)

    if exp_ts <= int(time.time()):
        raise HTTPException(status_code=401, detail="Token expired")

    expected_payload = f"{MYDAILY_PASSWORD}:{exp_ts}".encode()
    expected_sig = hmac.new(SECRET_KEY.encode(), expected_payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=401, detail="Invalid token")
