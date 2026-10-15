from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from dates import utc_day_bounds


def test_day_bounds_are_aware_utc_for_shanghai_midnight():
    """东八区日历日的起点是前一天 16:00 UTC，且必须带时区。"""
    start, end = utc_day_bounds(date(2024, 1, 2), ZoneInfo("Asia/Shanghai"))

    assert start.utcoffset() == timedelta(0)
    assert end.utcoffset() == timedelta(0)
    assert start == datetime(2024, 1, 1, 16, 0, tzinfo=timezone.utc)
    assert end == datetime(2024, 1, 2, 16, 0, tzinfo=timezone.utc)


def test_day_bounds_follow_local_midnight_across_dst():
    """夏令时切换日按当地午夜切分，日长不是固定的 24 小时。"""
    new_york = ZoneInfo("America/New_York")

    spring_start, spring_end = utc_day_bounds(date(2024, 3, 10), new_york)
    assert spring_start == datetime(2024, 3, 10, 5, 0, tzinfo=timezone.utc)
    assert spring_end == datetime(2024, 3, 11, 4, 0, tzinfo=timezone.utc)

    fall_start, fall_end = utc_day_bounds(date(2024, 11, 3), new_york)
    assert fall_start == datetime(2024, 11, 3, 4, 0, tzinfo=timezone.utc)
    assert fall_end == datetime(2024, 11, 4, 5, 0, tzinfo=timezone.utc)
