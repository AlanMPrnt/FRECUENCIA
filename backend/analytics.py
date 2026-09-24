from __future__ import annotations

from collections import Counter, defaultdict
import math
from statistics import median
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


def genre_breakdown(
    artists: list[dict[str, Any]], *, sample_size: int = 20
) -> list[dict[str, Any]]:
    """Describe genre presence in the ranked artist sample without inventing a score."""
    sample = artists[:sample_size]
    weighted_scores: Counter[str] = Counter()
    artist_names: dict[str, list[str]] = defaultdict(list)
    display_names: dict[str, str] = {}

    for index, artist in enumerate(sample):
        weight = max(1, len(sample) - index)
        seen: set[str] = set()
        for raw_genre in artist.get("genres") or []:
            genre = str(raw_genre).strip()
            key = genre.casefold()
            if not genre or key in seen:
                continue
            seen.add(key)
            display_names.setdefault(key, genre)
            weighted_scores[key] += weight
            artist_names[key].append(artist.get("name", "Artista"))

    if not weighted_scores:
        return []

    highest_score = max(weighted_scores.values())
    details = []
    for key, score in weighted_scores.most_common():
        names = artist_names[key]
        details.append(
            {
                "name": display_names[key],
                "weightedScore": score,
                "weight": round(score / highest_score * 100),
                "artistCount": len(names),
                "artistShare": round(len(names) / max(len(sample), 1) * 100),
                "artists": names[:5],
            }
        )
    return details


def _percentile(values: list[int], percentile: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return round(ordered[lower] * (1 - fraction) + ordered[upper] * fraction)


def ranked_track_statistics(
    tracks: list[dict[str, Any]],
    genres: list[dict[str, Any]],
    *,
    current_year: int,
) -> dict[str, Any]:
    """Compute interpretable descriptive statistics for Spotify's ranked sample."""
    artist_ids: set[str] = set()
    album_counts: Counter[str] = Counter()
    album_names: dict[str, str] = {}
    years: list[int] = []
    collaboration_count = 0

    for track in tracks:
        track_artists = track.get("artists") or []
        if len(track_artists) > 1:
            collaboration_count += 1
        for artist in track_artists:
            identifier = str(artist.get("id") or artist.get("name") or "").strip()
            if identifier:
                artist_ids.add(identifier)

        album = track.get("album") or {}
        album_key = str(album.get("id") or album.get("name") or "").strip()
        if album_key:
            album_counts[album_key] += 1
            album_names[album_key] = str(album.get("name") or "Álbum")
        release_date = str(album.get("release_date") or "")
        if release_date[:4].isdigit():
            year = int(release_date[:4])
            if 1900 <= year <= current_year + 1:
                years.append(year)

    genre_weights = [
        int(item.get("weightedScore") or 0)
        for item in genres
        if int(item.get("weightedScore") or 0) > 0
    ]
    total_genre_weight = sum(genre_weights)
    genre_entropy = 0.0
    if total_genre_weight:
        genre_entropy = -sum(
            (weight / total_genre_weight) * math.log(weight / total_genre_weight)
            for weight in genre_weights
        )

    most_present_album = album_counts.most_common(1)[0] if album_counts else ("", 0)
    most_present_album_count = most_present_album[1]
    median_year = round(median(years)) if years else None
    return {
        "sampleSize": len(tracks),
        "uniqueTrackArtists": len(artist_ids),
        "uniqueAlbums": len(album_counts),
        "collaborationCount": collaboration_count,
        "collaborationShare": (
            round(collaboration_count / len(tracks) * 100) if tracks else 0
        ),
        "mostPresentAlbumCount": most_present_album_count,
        "mostPresentAlbumName": album_names.get(most_present_album[0]),
        "albumConcentrationShare": (
            round(most_present_album_count / len(tracks) * 100) if tracks else 0
        ),
        "medianReleaseYear": median_year,
        "releaseYearQ1": _percentile(years, 0.25),
        "releaseYearQ3": _percentile(years, 0.75),
        "oldestReleaseYear": min(years) if years else None,
        "newestReleaseYear": max(years) if years else None,
        "medianReleaseAge": current_year - median_year if median_year else None,
        "effectiveGenreCount": round(math.exp(genre_entropy), 1)
        if total_genre_weight
        else None,
        "genreMethod": (
            "Entropía de Shannon sobre la presencia ponderada de géneros en el Top 20."
        ),
    }


def ranking_comparison(
    current: list[dict[str, Any]],
    baseline: list[dict[str, Any]],
    *,
    sample_size: int = 20,
) -> dict[str, Any]:
    """Return concrete Top-N overlap and membership changes."""
    current_sample = current[:sample_size]
    baseline_sample = baseline[:sample_size]
    current_ids = {item.get("id") for item in current_sample if item.get("id")}
    baseline_ids = {item.get("id") for item in baseline_sample if item.get("id")}
    shared_ids = current_ids & baseline_ids
    entered = [
        item.get("name", "Artista")
        for item in current_sample
        if item.get("id") and item["id"] not in baseline_ids
    ]
    exited = [
        item.get("name", "Artista")
        for item in baseline_sample
        if item.get("id") and item["id"] not in current_ids
    ]
    shared = [
        item.get("name", "Artista")
        for item in current_sample
        if item.get("id") in shared_ids
    ]
    return {
        "sampleSize": min(len(current_sample), len(baseline_sample)),
        "sharedCount": len(shared),
        "enteredCount": len(entered),
        "exitedCount": len(exited),
        "shared": shared[:6],
        "entered": entered[:6],
        "exited": exited[:6],
    }
