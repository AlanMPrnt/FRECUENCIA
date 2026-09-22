from __future__ import annotations

from collections import Counter
from typing import Any


def favorite_decade(tracks: list[dict[str, Any]]) -> str:
    decades: Counter[int] = Counter()
    for track in tracks:
        release_date = str((track.get("album") or {}).get("release_date", ""))
        if len(release_date) < 4 or not release_date[:4].isdigit():
            continue
        year = int(release_date[:4])
        if 1900 <= year <= 2100:
            decades[(year // 10) * 10] += 1
    if not decades:
        return "—"
    decade = decades.most_common(1)[0][0]
    return f"{decade}s"


def average_track_duration(tracks: list[dict[str, Any]]) -> str:
    durations = [
        int(track["duration_ms"])
        for track in tracks
        if isinstance(track.get("duration_ms"), (int, float))
        and track["duration_ms"] > 0
    ]
    if not durations:
        return "—"
    total_seconds = round(sum(durations) / len(durations) / 1000)
    minutes, seconds = divmod(total_seconds, 60)
    return f"{minutes}:{seconds:02d}"


def explicit_share(tracks: list[dict[str, Any]]) -> int:
    if not tracks:
        return 0
    return round(
        sum(1 for track in tracks if track.get("explicit") is True)
        / len(tracks)
        * 100
    )
