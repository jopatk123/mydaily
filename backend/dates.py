"""日记日历日期。

SQLite 保存的是去掉时区后的 UTC 时间。按日期筛选和「有日记的日期」
都要换算到请求指定的 IANA 时区，未指定时用 MYDAILY_TIMEZONE，默认 Asia/Shanghai。
"""

import os
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIMEZONE = os.getenv("MYDAILY_TIMEZONE", "Asia/Shanghai") or "Asia/Shanghai"


def resolve_timezone(name: str | None) -> ZoneInfo:
    raw = (name if name is not None else DEFAULT_TIMEZONE).strip() or DEFAULT_TIMEZONE
    try:
        return ZoneInfo(raw)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Invalid timezone: {raw}") from exc


def parse_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Invalid date format. Use YYYY-MM-DD") from exc


def assume_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def to_local_date(value: datetime, tz: ZoneInfo) -> date:
    return assume_utc(value).astimezone(tz).date()


def utc_naive_day_bounds(day: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """Local calendar day as a half-open UTC range, stored naive to match SQLite."""
    start = datetime.combine(day, time.min, tzinfo=tz).astimezone(timezone.utc).replace(tzinfo=None)
    next_day = day + timedelta(days=1)
    end = datetime.combine(next_day, time.min, tzinfo=tz).astimezone(timezone.utc).replace(tzinfo=None)
    return start, end
