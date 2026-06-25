"""
Cache abstraction — uses Redis when available, falls back to in-memory TTL cache.
All cache keys are namespaced by org_id so tenant isolation is preserved.
"""
import json
import time
from typing import Any, Optional
from decimal import Decimal

# ── Redis setup ───────────────────────────────────────────────────────────────

try:
    import redis as _redis_lib
    _client = _redis_lib.Redis(
        host="localhost", port=6379, db=0,
        decode_responses=True,
        socket_connect_timeout=0.5,
        socket_timeout=0.5,
    )
    _client.ping()
    REDIS_AVAILABLE = True
except Exception:
    _client = None
    REDIS_AVAILABLE = False

# ── In-memory fallback ────────────────────────────────────────────────────────

_mem: dict[str, dict] = {}


def _mem_get(key: str) -> Optional[Any]:
    entry = _mem.get(key)
    if entry and entry["exp"] > time.monotonic():
        return entry["val"]
    _mem.pop(key, None)
    return None


def _mem_set(key: str, val: Any, ttl: int):
    _mem[key] = {"val": val, "exp": time.monotonic() + ttl}


def _mem_delete(key: str):
    _mem.pop(key, None)


def _mem_delete_prefix(prefix: str):
    for k in list(_mem):
        if k.startswith(prefix):
            del _mem[k]


# ── JSON serialisation (handles Decimal) ─────────────────────────────────────

class _DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


def _dumps(val: Any) -> str:
    return json.dumps(val, cls=_DecimalEncoder)


def _loads(raw: str) -> Any:
    return json.loads(raw)


# ── Public API ────────────────────────────────────────────────────────────────

def cache_get(key: str) -> Optional[Any]:
    try:
        if REDIS_AVAILABLE:
            raw = _client.get(key)
            return _loads(raw) if raw else None
    except Exception:
        pass
    return _mem_get(key)


def cache_set(key: str, val: Any, ttl: int = 60):
    try:
        if REDIS_AVAILABLE:
            _client.setex(key, ttl, _dumps(val))
            return
    except Exception:
        pass
    _mem_set(key, val, ttl)


def cache_delete(key: str):
    try:
        if REDIS_AVAILABLE:
            _client.delete(key)
            return
    except Exception:
        pass
    _mem_delete(key)


def cache_delete_prefix(prefix: str):
    """Delete all keys starting with prefix (org-level invalidation)."""
    try:
        if REDIS_AVAILABLE:
            keys = _client.keys(f"{prefix}*")
            if keys:
                _client.delete(*keys)
            return
    except Exception:
        pass
    _mem_delete_prefix(prefix)


# ── Convenience: org-scoped helpers ──────────────────────────────────────────

def stats_key(org_id) -> str:
    return f"stats:{org_id}"


def report_key(org_id, date_from, date_to) -> str:
    return f"report:{org_id}:{date_from}:{date_to}"


def invalidate_org(org_id):
    """Call after any write that changes stats (create bill, payment, cancel)."""
    cache_delete(stats_key(org_id))
    cache_delete_prefix(f"report:{org_id}:")
