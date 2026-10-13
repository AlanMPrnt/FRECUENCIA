from __future__ import annotations

from collections import Counter, defaultdict
import math
from statistics import median
from typing import Any

from backend.genres import artist_families


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


def family_breakdown(
    artists: list[dict[str, Any]], *, sample_size: int = 20
) -> list[dict[str, Any]]:
    """Group the ranked sample into genre families. Each artist contributes its
    rank weight once, split across its families, so shares add up to 100."""
    sample = artists[:sample_size]
    scores: Counter[str] = Counter()
    names: dict[str, list[str]] = defaultdict(list)
    for index, artist in enumerate(sample):
        families = artist_families(artist.get("genres") or [])
        if not families:
            continue
        weight = max(1, len(sample) - index) / len(families)
        for family in families:
            scores[family] += weight
            names[family].append(artist.get("name", "Artista"))
    return _family_rows(scores, names, "artistCount")


def track_family_breakdown(
    tracks: list[dict[str, Any]], genres_by_artist_id: dict[str, list[str]]
) -> dict[str, Any]:
    """Genre families of the ranked songs, through each song's main artist."""
    scores: Counter[str] = Counter()
    names: dict[str, list[str]] = defaultdict(list)
    covered = 0
    for index, track in enumerate(tracks):
        main_artist = (track.get("artists") or [{}])[0]
        families = artist_families(genres_by_artist_id.get(str(main_artist.get("id") or ""), []))
        if not families:
            continue
        covered += 1
        weight = max(1, len(tracks) - index) / len(families)
        for family in families:
            scores[family] += weight
            names[family].append(track.get("name", "Canción"))
    return {
        "families": _family_rows(scores, names, "trackCount"),
        "coveredTracks": covered,
        "sampleSize": len(tracks),
    }


def _family_rows(
    scores: Counter[str], names: dict[str, list[str]], count_key: str
) -> list[dict[str, Any]]:
    total = sum(scores.values())
    if not total:
        return []
    return [
        {
            "name": family,
            "share": round(score / total * 100),
            "weightedScore": round(score, 3),
            count_key: len(names[family]),
            "examples": names[family][:4],
        }
        for family, score in scores.most_common()
    ]


def _distribution(rows: list[dict[str, Any]]) -> dict[str, float]:
    total = sum(float(row.get("weightedScore") or 0) for row in rows)
    if not total:
        return {}
    return {row["name"]: float(row["weightedScore"]) / total for row in rows}


def jensen_shannon_distance(p: dict[str, float], q: dict[str, float]) -> float:
    """Symmetric distance between two distributions: 0 identical, 1 disjoint."""
    keys = set(p) | set(q)
    mixture = {key: (p.get(key, 0.0) + q.get(key, 0.0)) / 2 for key in keys}

    def kl(a: dict[str, float]) -> float:
        return sum(
            a[key] * math.log2(a[key] / mixture[key]) for key in a if a[key] > 0
        )

    divergence = (kl(p) + kl(q)) / 2
    return math.sqrt(max(0.0, min(1.0, divergence)))


def taste_shift(
    current: list[dict[str, Any]], baseline: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """How far the family mix moved between two periods, and what moved it."""
    p, q = _distribution(current), _distribution(baseline)
    if not p or not q:
        return None
    deltas = {key: (p.get(key, 0.0) - q.get(key, 0.0)) * 100 for key in set(p) | set(q)}
    rising = sorted((key for key, value in deltas.items() if value >= 3), key=lambda key: -deltas[key])
    falling = sorted((key for key, value in deltas.items() if value <= -3), key=lambda key: deltas[key])
    return {
        "distance": round(jensen_shannon_distance(p, q) * 100),
        "rising": [{"name": key, "delta": round(deltas[key])} for key in rising[:3]],
        "falling": [{"name": key, "delta": round(deltas[key])} for key in falling[:3]],
        "method": "Distancia de Jensen-Shannon entre las mezclas de familias de géneros.",
    }


def rank_biased_overlap(
    current_ids: list[str], baseline_ids: list[str], *, persistence: float = 0.9
) -> int | None:
    """Extrapolated rank-biased overlap (Webber et al., 2010), as a percentage.

    Unlike a plain overlap count it rewards agreement at the top: swapping the
    #1 and #2 artists changes more than swapping #40 and #41.
    """
    first = [item for item in current_ids if item]
    second = [item for item in baseline_ids if item]
    depth = min(len(first), len(second))
    if not depth:
        return None
    seen_first: set[str] = set()
    seen_second: set[str] = set()
    overlap = 0
    weighted = 0.0
    for position in range(1, depth + 1):
        a, b = first[position - 1], second[position - 1]
        if a == b:
            overlap += 1
        else:
            overlap += (a in seen_second) + (b in seen_first)
        seen_first.add(a)
        seen_second.add(b)
        weighted += overlap / position * persistence ** position
    score = overlap / depth * persistence ** depth + (1 - persistence) / persistence * weighted
    return round(min(1.0, score) * 100)


def bridge_artists(
    artists: list[dict[str, Any]], *, sample_size: int = 20, limit: int = 4
) -> list[dict[str, Any]]:
    """Artists that connect several genre families of the sample."""
    bridges = []
    for index, artist in enumerate(artists[:sample_size]):
        families = artist_families(artist.get("genres") or [])
        if len(families) >= 2:
            bridges.append((-len(families), index, artist.get("name", "Artista"), families))
    bridges.sort()
    return [
        {"name": name, "families": families[:3], "rank": index + 1}
        for _, index, name, families in bridges[:limit]
    ]


def family_combinations(
    artists: list[dict[str, Any]], *, sample_size: int = 20, limit: int = 3
) -> list[dict[str, Any]]:
    """Family pairs that appear together inside the same artists."""
    pairs: Counter[tuple[str, str]] = Counter()
    examples: dict[tuple[str, str], list[str]] = defaultdict(list)
    for artist in artists[:sample_size]:
        families = sorted(artist_families(artist.get("genres") or []))
        for i, first in enumerate(families):
            for second in families[i + 1:]:
                pairs[(first, second)] += 1
                examples[(first, second)].append(artist.get("name", "Artista"))
    return [
        {"families": list(pair), "artistCount": count, "artists": examples[pair][:3]}
        for pair, count in pairs.most_common(limit)
    ]
