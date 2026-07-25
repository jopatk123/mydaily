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

# 不再提供硬编码默认凭据——公网可查的弱默认值等同于漏洞。
# 启用认证时必须显式设置；如需禁用认证（仅本地信任环境），显式设 MYDAILY_AUTH_DISABLED=true。
MYDAILY_PASSWORD = os.getenv("MYDAILY_PASSWORD", "")
SECRET_KEY = os.getenv("MYDAILY_SECRET_KEY", "")

# Token 默认有效期 30 天，与前端 localStorage 保持一致
TOKEN_TTL_SECONDS = int(os.getenv("MYDAILY_TOKEN_TTL_SECONDS", str(30 * 24 * 60 * 60)))

# 显式禁用认证（仅本地信任环境使用；生产必须设置密码并保持此项未启用）
AUTH_DISABLED = os.getenv("MYDAILY_AUTH_DISABLED", "").lower() in ("1", "true", "yes")

if AUTH_DISABLED:
    logger.warning(
        "SECURITY WARNING: Auth is disabled (MYDAILY_AUTH_DISABLED=true). "
        "This must NEVER be used in production. Set MYDAILY_PASSWORD and "
        "MYDAILY_SECRET_KEY for any non-trusted environment."
    )

# Fail-closed：启用认证时密码与密钥均不可为空
if not AUTH_DISABLED:
    if not MYDAILY_PASSWORD:
        raise RuntimeError(
            "MYDAILY_PASSWORD is empty. Set a strong password, or explicitly "
            "set MYDAILY_AUTH_DISABLED=true to disable auth (local only)."
        )
    if not SECRET_KEY:
        raise RuntimeError(
            "MYDAILY_SECRET_KEY is empty. Generate one with "
            '`python3 -c "import secrets; print(secrets.token_hex(32))"`, '
            "or set MYDAILY_AUTH_DISABLED=true to disable auth (local only)."
        )


class _LoginRateLimiter:
    """Simple in-memory rate limiter for login attempts, keyed by client IP.

    注意：状态保存在进程内存中，仅在单 worker 模式下生效（uvicorn 默认 1 worker）。
    若部署为多 worker（如 ``uvicorn --workers 4``），每个进程独立计数，
    实际阈值会放大 N 倍。多副本部署应替换为 Redis 等共享存储实现。
    """

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
    AUTH_DISABLED=true 时直接放行（仅本地信任环境使用）。
    """
    if AUTH_DISABLED:
        return

    if not MYDAILY_PASSWORD:
        # 防御性分支：理论不可达，启动时已由 fail-closed 校验保证
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
