from __future__ import annotations

import json
import os
import re
import secrets
import sqlite3
import time
import threading
import unicodedata
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as URLRequest, urlopen

import spotipy
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from redis import Redis
from spotipy.cache_handler import CacheHandler
from spotipy.oauth2 import SpotifyOAuth
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from backend.analytics import (
    average_track_duration,
    bridge_artists,
    explicit_share,
    family_breakdown,
    family_combinations,
    favorite_decade,
    genre_breakdown,
    rank_biased_overlap,
    ranked_track_statistics,
    ranking_comparison,
    taste_shift,
    track_family_breakdown,
)
from backend.genres import canonical_genre, genres_from_tags


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DIST_DIR = ROOT / "dist"
IS_VERCEL = os.getenv("VERCEL", "").strip() == "1"
DATA_DIR = Path("/tmp/frecuencia") if IS_VERCEL else ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", DATA_DIR / "frecuencia.db"))
REDIS_URL = os.getenv("REDIS_URL", "").strip()
CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID", "").strip()
CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET", "").strip()
REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI", "").strip()
if not REDIRECT_URI and not IS_PRODUCTION:
    REDIRECT_URI = "http://127.0.0.1:8000/auth/callback"

SESSION_SECRET = os.getenv("SESSION_SECRET", "change-me-in-development")
COOKIE_SECURE = os.getenv(
    "COOKIE_SECURE", "true" if IS_PRODUCTION else "false"
).lower() == "true"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "").split(",")
    if host.strip()
]
INSIGHTS_CACHE_TTL_SECONDS = int(
    os.getenv("INSIGHTS_CACHE_TTL_SECONDS", "600")
)
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180
GENRE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30
NEGATIVE_GENRE_TTL_SECONDS = 60 * 60 * 24 * 3
GENRE_CACHE_VERSION = "v5"
# Serverless functions may stop at 10 s on small plans: keep the genre lookup
# well inside that and finish the rest on the next visit.
GENRE_LOOKUP_BUDGET_SECONDS = float(
    os.getenv("GENRE_LOOKUP_BUDGET_SECONDS", "6" if IS_VERCEL else "12")
)
PARTIAL_INSIGHTS_TTL_SECONDS = 90
SPOTIFY_ARTIST_LOOKUPS_PER_REQUEST = 10
MUSICBRAINZ_BATCH_SIZE = 25
CACHE_SCHEMA_VERSION = "v5"
SCOPES = "user-top-read user-read-private"
MUSICBRAINZ_ROOT = "https://musicbrainz.org/ws/2/"
MUSICBRAINZ_USER_AGENT = os.getenv(
    "MUSICBRAINZ_USER_AGENT",
    "Frecuencia/0.7 (https://github.com/AlanMPrnt/FRECUENCIA)",
)
musicbrainz_lock = threading.Lock()
musicbrainz_last_request = 0.0

if IS_PRODUCTION:
    missing = []
    if not CLIENT_ID:
        missing.append("SPOTIPY_CLIENT_ID")
    if not CLIENT_SECRET:
        missing.append("SPOTIPY_CLIENT_SECRET")
    if not REDIRECT_URI:
        missing.append("SPOTIPY_REDIRECT_URI")
    if len(SESSION_SECRET) < 32 or SESSION_SECRET == "change-me-in-development":
        missing.append("SESSION_SECRET (mÃ­nimo 32 caracteres)")
    if REDIRECT_URI and not REDIRECT_URI.startswith("https://"):
        missing.append("SPOTIPY_REDIRECT_URI debe usar HTTPS en producciÃ³n")
    if missing:
        raise RuntimeError(
            "ConfiguraciÃ³n de producciÃ³n incompleta: " + ", ".join(missing)
        )

RANGE_COPY = {
    "short_term": ("Ahora", "Lo que mÃ¡s te definiÃ³ durante las Ãºltimas 4 semanas."),
    "medium_term": (
        "Ãšltimos 6 meses",
        "La mÃºsica que sostuvo tu ritmo durante los Ãºltimos 6 meses.",
    ),
    "long_term": ("Ãšltimo aÃ±o", "Los nombres y sonidos que construyeron tu Ãºltimo aÃ±o."),
}

COLOR_PALETTE = [
    "#b796ff",
    "#ff8760",
    "#d9ff43",
    "#72d8ff",
    "#ff89c0",
    "#f5c451",
    "#66e3bc",
]

redis_client = Redis.from_url(REDIS_URL, decode_responses=True) if REDIS_URL else None


def spotify_configured() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET and REDIRECT_URI)


@contextmanager
def open_database() -> Iterator[sqlite3.Connection]:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS spotify_tokens (
            session_id TEXT PRIMARY KEY,
            token_info TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS spotify_insights (
            session_id TEXT NOT NULL,
            time_range TEXT NOT NULL,
            payload TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            PRIMARY KEY (session_id, time_range)
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS artist_genres (
            artist_key TEXT PRIMARY KEY,
            genres TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        )
        """
    )
    try:
        with connection:
            yield connection
    finally:
        connection.close()


class SQLiteTokenCache(CacheHandler):
    """Persists OAuth tokens server-side for a single-instance deployment."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id

    def get_cached_token(self) -> dict[str, Any] | None:
        with open_database() as connection:
            row = connection.execute(
                "SELECT token_info FROM spotify_tokens WHERE session_id = ?",
                (self.session_id,),
            ).fetchone()
        if not row:
            return None
        try:
            return json.loads(row[0])
        except json.JSONDecodeError:
            self.delete()
            return None

    def save_token_to_cache(self, token_info: dict[str, Any]) -> None:
        with open_database() as connection:
            connection.execute(
                """
                INSERT INTO spotify_tokens(session_id, token_info, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    token_info = excluded.token_info,
                    updated_at = excluded.updated_at
                """,
                (self.session_id, json.dumps(token_info), int(time.time())),
            )

    def delete(self) -> None:
        with open_database() as connection:
            connection.execute(
                "DELETE FROM spotify_tokens WHERE session_id = ?", (self.session_id,)
            )
            connection.execute(
                "DELETE FROM spotify_insights WHERE session_id = ?", (self.session_id,)
            )


class RedisTokenCache(CacheHandler):
    """Shares OAuth tokens safely between multiple application instances."""

    def __init__(self, session_id: str, client: Redis) -> None:
        self.session_id = session_id
        self.client = client

    @property
    def key(self) -> str:
        return f"frecuencia:token:{self.session_id}"

    def get_cached_token(self) -> dict[str, Any] | None:
        value = self.client.get(self.key)
        if not value:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            self.delete()
            return None

    def save_token_to_cache(self, token_info: dict[str, Any]) -> None:
        self.client.setex(self.key, TOKEN_TTL_SECONDS, json.dumps(token_info))

    def delete(self) -> None:
        keys = [
            self.key,
            *(
                f"frecuencia:insights:{CACHE_SCHEMA_VERSION}:{self.session_id}:{item}"
                for item in RANGE_COPY
            ),
        ]
        self.client.delete(*keys)


def token_cache_for(session_id: str) -> CacheHandler:
    if redis_client is not None:
        return RedisTokenCache(session_id, redis_client)
    return SQLiteTokenCache(session_id)


def cached_insights(session_id: str, time_range: str) -> dict[str, Any] | None:
    cache_range = f"{CACHE_SCHEMA_VERSION}:{time_range}"
    if redis_client is not None:
        value = redis_client.get(
            f"frecuencia:insights:{CACHE_SCHEMA_VERSION}:{session_id}:{time_range}"
        )
        return json.loads(value) if value else None

    now = int(time.time())
    with open_database() as connection:
        row = connection.execute(
            """
            SELECT payload FROM spotify_insights
            WHERE session_id = ? AND time_range = ? AND expires_at > ?
            """,
            (session_id, cache_range, now),
        ).fetchone()
        connection.execute(
            "DELETE FROM spotify_insights WHERE expires_at <= ?", (now,)
        )
    return json.loads(row[0]) if row else None


def cache_insights(
    session_id: str, time_range: str, payload: dict[str, Any]
) -> None:
    cache_range = f"{CACHE_SCHEMA_VERSION}:{time_range}"
    serialized = json.dumps(payload, ensure_ascii=False)
    # Incomplete genre coverage is cached briefly, so the next visit can fill it.
    ttl = (
        INSIGHTS_CACHE_TTL_SECONDS
        if payload.get("genreLookupComplete", True)
        else min(INSIGHTS_CACHE_TTL_SECONDS, PARTIAL_INSIGHTS_TTL_SECONDS)
    )
    if redis_client is not None:
        redis_client.setex(
            f"frecuencia:insights:{CACHE_SCHEMA_VERSION}:{session_id}:{time_range}",
            ttl,
            serialized,
        )
        return

    with open_database() as connection:
        connection.execute(
            """
            INSERT INTO spotify_insights(session_id, time_range, payload, expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(session_id, time_range) DO UPDATE SET
                payload = excluded.payload,
                expires_at = excluded.expires_at
            """,
            (
                session_id,
                cache_range,
                serialized,
                int(time.time()) + ttl,
            ),
        )


def session_id_for(request: Request) -> str:
    session_id = request.session.get("session_id")
    if not session_id:
        session_id = secrets.token_urlsafe(32)
        request.session["session_id"] = session_id
    return session_id


def oauth_for(request: Request, *, state: str | None = None) -> SpotifyOAuth:
    if not spotify_configured():
        raise HTTPException(
            status_code=503,
            detail="La conexiÃ³n con Spotify todavÃ­a no estÃ¡ configurada.",
        )
    return SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        scope=SCOPES,
        state=state,
        cache_handler=token_cache_for(session_id_for(request)),
        open_browser=False,
        show_dialog=False,
    )


def spotify_client(request: Request) -> spotipy.Spotify:
    oauth = oauth_for(request)
    token_info = oauth.cache_handler.get_cached_token()
    if not token_info:
        raise HTTPException(status_code=401, detail="ConectÃ¡ tu cuenta de Spotify.")
    try:
        token = oauth.validate_token(token_info)
    except spotipy.oauth2.SpotifyOauthError as exc:
        if getattr(exc, "error", None) == "invalid_grant":
            oauth.cache_handler.delete()
            raise HTTPException(status_code=401, detail="La sesiÃ³n de Spotify expirÃ³.") from exc
        raise HTTPException(status_code=503, detail="No pudimos renovar la sesiÃ³n. ReintentÃ¡ en un momento.") from exc
    if not token:
        oauth.cache_handler.delete()
        raise HTTPException(status_code=401, detail="La sesiÃ³n de Spotify expirÃ³.")
    return spotipy.Spotify(auth_manager=oauth, requests_timeout=10, retries=2)


class MusicBrainzUnavailable(Exception):
    """MusicBrainz could not answer now. Never cached as "artist has no genres"."""


class GenreBudgetExceeded(Exception):
    """The request spent its lookup budget; the rest is resolved on a later visit."""


def normalize_artist_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(
        character for character in normalized if not unicodedata.combining(character)
    )
    return re.sub(r"[^a-z0-9]+", " ", without_accents.casefold()).strip()


def cached_genre_record(key: str) -> dict[str, Any] | None:
    cache_key = f"{GENRE_CACHE_VERSION}:{key}"
    if redis_client is not None:
        value = redis_client.get(f"frecuencia:genres:{cache_key}")
    else:
        with open_database() as connection:
            row = connection.execute(
                "SELECT genres FROM artist_genres WHERE artist_key = ? AND expires_at > ?",
                (cache_key, int(time.time())),
            ).fetchone()
        value = row[0] if row else None
    if value is None:
        return None
    try:
        record = json.loads(value)
    except json.JSONDecodeError:
        return None
    return record if isinstance(record, dict) else None


def cache_genre_record(
    key: str, record: dict[str, Any], ttl: int | None = None
) -> None:
    cache_key = f"{GENRE_CACHE_VERSION}:{key}"
    if ttl is None:
        ttl = GENRE_CACHE_TTL_SECONDS if record.get("genres") else NEGATIVE_GENRE_TTL_SECONDS
    serialized = json.dumps(record, ensure_ascii=False)
    if redis_client is not None:
        redis_client.setex(f"frecuencia:genres:{cache_key}", ttl, serialized)
        return
    with open_database() as connection:
        connection.execute(
            """
            INSERT INTO artist_genres(artist_key, genres, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(artist_key) DO UPDATE SET
                genres = excluded.genres,
                expires_at = excluded.expires_at
            """,
            (cache_key, serialized, int(time.time()) + ttl),
        )


def musicbrainz_get(path: str, params: list[tuple[str, str]]) -> dict[str, Any] | None:
    """Throttled GET to MusicBrainz. Returns None on 404."""
    global musicbrainz_last_request
    url = f"{MUSICBRAINZ_ROOT}{path}?{urlencode([*params, ('fmt', 'json')])}"
    request = URLRequest(
        url,
        headers={"User-Agent": MUSICBRAINZ_USER_AGENT, "Accept": "application/json"},
    )
    # MusicBrainz allows one request per second. Share the slot across
    # instances when Redis is configured.
    with musicbrainz_lock:
        wait = max(0.0, 1.1 - (time.monotonic() - musicbrainz_last_request))
        if wait:
            time.sleep(wait)
        if redis_client is not None:
            for _ in range(4):
                if redis_client.set("frecuencia:musicbrainz:rate", "1", nx=True, px=1100):
                    break
                time.sleep(0.4)
            else:
                raise MusicBrainzUnavailable("rate slot busy")
        musicbrainz_last_request = time.monotonic()
    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code == 404:
            return None
        raise MusicBrainzUnavailable(str(exc)) from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise MusicBrainzUnavailable(str(exc)) from exc


def musicbrainz_ids_for_spotify(spotify_ids: list[str]) -> dict[str, str]:
    """Resolve Spotify artist IDs to MusicBrainz IDs through MusicBrainz's own
    Spotify links. Identity is exact, so homonyms cannot be confused."""
    resources = {f"https://open.spotify.com/artist/{item}": item for item in spotify_ids}
    payload = musicbrainz_get(
        "url", [*(("resource", resource) for resource in resources), ("inc", "artist-rels")]
    )
    if payload is None:
        return {}
    url_items = payload["urls"] if "urls" in payload else [payload]
    matches: dict[str, str] = {}
    for item in url_items or []:
        spotify_id = resources.get(str(item.get("resource") or ""))
        artist_ids = {
            relation["artist"]["id"]
            for relation in item.get("relations") or []
            if (relation.get("artist") or {}).get("id")
        }
        if spotify_id and len(artist_ids) == 1:
            matches[spotify_id] = artist_ids.pop()
    return matches


def musicbrainz_genres_for_ids(mbids: list[str]) -> dict[str, list[str]]:
    wanted = set(mbids)
    query = " OR ".join(f"arid:{mbid}" for mbid in mbids)
    payload = musicbrainz_get("artist", [("query", query), ("limit", "100")]) or {}
    return {
        artist["id"]: genres_from_tags(artist.get("tags") or [])
        for artist in payload.get("artists") or []
        if artist.get("id") in wanted
    }


def musicbrainz_genres(artist_names: list[str]) -> dict[str, list[str]]:
    """Name search, used only for artists without a Spotify link in MusicBrainz."""
    if not artist_names:
        return {}
    queried_names = artist_names[:24]
    clauses = []
    for name in queried_names:
        escaped = name.replace("\\", "\\\\").replace('"', '\\"')
        clauses.append(f'artist:"{escaped}"')
    try:
        payload = musicbrainz_get(
            "artist", [("query", " OR ".join(clauses)), ("limit", "100")]
        ) or {}
    except MusicBrainzUnavailable:
        return {}

    candidates: dict[str, list[dict[str, Any]]] = {}
    requested_keys = {normalize_artist_key(name) for name in queried_names}
    for artist in payload.get("artists") or []:
        key = normalize_artist_key(str(artist.get("name") or ""))
        if key in requested_keys:
            candidates.setdefault(key, []).append(artist)

    results: dict[str, list[str]] = {}
    for name in queried_names:
        key = normalize_artist_key(name)
        matches = candidates.get(key) or []
        # A name alone cannot resolve homonyms. Do not assign the most popular
        # namesake's genres to a different Spotify artist.
        results[key] = genres_from_tags(matches[0].get("tags") or []) if len(matches) == 1 else []
    return results


def spotify_artist_genres(
    sp: spotipy.Spotify, spotify_ids: list[str], deadline: float
) -> dict[str, list[str]]:
    """GET /artists/{id} still returned genres for some apps after the February
    2026 change. Probe it and stop spending calls once it proves empty."""
    flag = cached_genre_record("spotify-artist-endpoint")
    if flag and flag.get("available") is False:
        return {}
    found: dict[str, list[str]] = {}
    lookups = 0
    for spotify_id in spotify_ids[:SPOTIFY_ARTIST_LOOKUPS_PER_REQUEST]:
        if time.monotonic() > deadline:
            break
        try:
            artist = sp.artist(spotify_id)
        except Exception:
            break  # Rate limits and outages leave the work for MusicBrainz.
        lookups += 1
        if not isinstance(artist, dict) or "genres" not in artist:
            cache_genre_record("spotify-artist-endpoint", {"available": False}, ttl=60 * 60 * 24)
            break
        genres = [genre for genre in map(canonical_genre, artist.get("genres") or []) if genre]
        if genres:
            found[spotify_id] = genres[:5]
        elif lookups >= 8 and not found:
            cache_genre_record("spotify-artist-endpoint", {"available": False}, ttl=60 * 60 * 24)
            break
    return found


def enrich_artist_genres(
    artists_by_range: dict[str, list[dict[str, Any]]],
    tracks_by_range: dict[str, list[dict[str, Any]]] | None = None,
    sp: spotipy.Spotify | None = None,
) -> tuple[bool, dict[str, list[str]]]:
    """Attach verified genres to artists.

    Order of evidence: genres already in the Spotify payload, Spotify's
    single-artist endpoint, MusicBrainz linked to the exact Spotify ID and,
    last, MusicBrainz by unambiguous name. Returns whether every lookup
    finished and the genres per Spotify artist ID, including track artists.
    """
    deadline = time.monotonic() + GENRE_LOOKUP_BUDGET_SECONDS
    names: dict[str, str] = {}
    priority: set[str] = set()
    records: dict[str, dict[str, Any]] = {}

    def remember(artist: dict[str, Any], *, important: bool = False) -> None:
        spotify_id = str(artist.get("id") or "")
        name = str(artist.get("name") or "").strip()
        if not spotify_id or not name:
            return
        names.setdefault(spotify_id, name)
        if important:
            priority.add(spotify_id)
        payload_genres = [g for g in map(canonical_genre, artist.get("genres") or []) if g]
        if payload_genres and spotify_id not in records:
            records[spotify_id] = {"genres": payload_genres[:5], "source": "Spotify"}

    for artists in artists_by_range.values():
        for artist in artists[:20]:
            remember(artist, important=True)
    for artists in artists_by_range.values():
        for artist in artists[20:]:
            remember(artist)
    for tracks in (tracks_by_range or {}).values():
        for track in tracks:
            if track.get("artists"):
                remember(track["artists"][0])

    pending = []
    for spotify_id in names:
        if spotify_id in records:
            continue
        cached = cached_genre_record(f"artist:{spotify_id}")
        if cached is None:
            pending.append(spotify_id)
        else:
            records[spotify_id] = cached
    # Most visible artists first, so a cut-short request still fills the Top 20.
    pending.sort(key=lambda item: item not in priority)

    def store(spotify_id: str, record: dict[str, Any]) -> None:
        records[spotify_id] = record
        cache_genre_record(f"artist:{spotify_id}", record)

    if pending and sp is not None:
        important = [item for item in pending if item in priority]
        for spotify_id, genres in spotify_artist_genres(sp, important, deadline).items():
            store(spotify_id, {"genres": genres, "source": "Spotify"})
        pending = [item for item in pending if item not in records]

    complete = True
    try:
        unlinked: list[str] = []
        for offset in range(0, len(pending), MUSICBRAINZ_BATCH_SIZE):
            if time.monotonic() > deadline:
                raise GenreBudgetExceeded
            batch = pending[offset:offset + MUSICBRAINZ_BATCH_SIZE]
            mbids = musicbrainz_ids_for_spotify(batch)
            unlinked.extend(item for item in batch if item not in mbids)
            if not mbids:
                continue
            if time.monotonic() > deadline:
                raise GenreBudgetExceeded
            genres_by_mbid = musicbrainz_genres_for_ids(sorted(set(mbids.values())))
            for spotify_id, mbid in mbids.items():
                genres = genres_by_mbid.get(mbid, [])
                store(spotify_id, {
                    "genres": genres,
                    "source": "MusicBrainz" if genres else None,
                    "mbid": mbid,
                })

        for offset in range(0, len(unlinked), 20):
            if time.monotonic() > deadline:
                raise GenreBudgetExceeded
            batch = unlinked[offset:offset + 20]
            discovered = musicbrainz_genres([names[item] for item in batch])
            for spotify_id in batch:
                key = normalize_artist_key(names[spotify_id])
                if key not in discovered:
                    complete = False  # An outage is not evidence that an artist has no genres.
                    continue
                genres = discovered[key]
                store(spotify_id, {
                    "genres": genres,
                    "source": "MusicBrainz por nombre" if genres else None,
                })
    except (MusicBrainzUnavailable, GenreBudgetExceeded):
        complete = False

    for artists in artists_by_range.values():
        for artist in artists:
            record = records.get(str(artist.get("id") or "")) or {}
            genres = list(record.get("genres") or [])
            artist["genres"] = genres
            artist["_genre_source"] = record.get("source") if genres else None
    genre_index = {
        spotify_id: list(record.get("genres") or []) for spotify_id, record in records.items()
    }
    return complete and all(item in records for item in names), genre_index


def image_url(item: dict[str, Any]) -> str | None:
    images = item.get("images") or []
    return images[0].get("url") if images else None


def artist_genre(artist: dict[str, Any]) -> str:
    genres = artist.get("genres") or []
    return genres[0] if genres else "gÃ©nero no verificado"


def rank_movement(
    current_id: str, baseline_positions: dict[str, int], current_index: int
) -> int | None:
    baseline_index = baseline_positions.get(current_id)
    if baseline_index is None:
        return None
    return baseline_index - current_index


def genre_profile(genres: list[dict[str, Any]]) -> str:
    if not genres:
        return "GÃ©neros por verificar"
    if len(genres) == 1:
        return genres[0]["name"]
    return f"{genres[0]['name']} Ã— {genres[1]['name']}"


def insight_cards(
    comparison: dict[str, Any],
    genres: list[dict[str, Any]],
    tracks: list[dict[str, Any]],
    genre_sample_size: int,
) -> list[dict[str, Any]]:
    entered = comparison["entered"]
    exited = comparison["exited"]
    discovery_facts = [
        "Entraron: " + (", ".join(entered) if entered else "ninguno"),
        "Salieron: " + (", ".join(exited) if exited else "ninguno"),
        f"Se repiten {comparison['sharedCount']} de {comparison['sampleSize']} artistas.",
    ]

    if genres:
        top_genre = genres[0]
        related = ", ".join(top_genre["artists"]) or "sin nombres verificados"
        next_genres = ", ".join(item["name"] for item in genres[1:4]) or "ninguno"
        pattern_title = f"{top_genre['name']} tiene mayor presencia"
        pattern_copy = (
            f"Aparece en {top_genre['artistCount']} de los primeros {genre_sample_size} artistas "
            "del ranking de afinidad."
        )
        pattern_facts = [
            f"Artistas asociados: {related}.",
            f"TambiÃ©n aparecen: {next_genres}.",
            "Los gÃ©neros describen artistas; no son minutos ni reproducciones.",
        ]
    else:
        pattern_title = "TodavÃ­a no hay gÃ©neros verificados"
        pattern_copy = (
            "Spotify no entregÃ³ categorÃ­as y MusicBrainz no pudo completar "
            "esta selecciÃ³n."
        )
        pattern_facts = [
            "No mostramos etiquetas de relleno.",
            "ProbÃ¡ Actualizar mÃ¡s tarde para volver a consultar la fuente externa.",
        ]

    signature_facts = [
        f"DÃ©cada con mÃ¡s canciones: {favorite_decade(tracks)}.",
        f"DuraciÃ³n media: {average_track_duration(tracks)}.",
        f"Contenido explÃ­cito: {explicit_share(tracks)}% del Top {len(tracks)}.",
    ]
    return [
        {
            "title": (
                f"{comparison['enteredCount']} entradas en el Top "
                f"{comparison['sampleSize']}"
            ),
            "copy": f"Comparado con {comparison['label'].lower()}.",
            "facts": discovery_facts,
        },
        {
            "title": pattern_title,
            "copy": pattern_copy,
            "facts": pattern_facts,
        },
        {
            "title": "Tu selecciÃ³n, sin adjetivos inventados",
            "copy": "Tres medidas observables dentro de las canciones que Spotify devolviÃ³.",
            "facts": signature_facts,
        },
    ]


def build_all_insights(sp: spotipy.Spotify) -> dict[str, dict[str, Any]]:
    artists_by_range: dict[str, list[dict[str, Any]]] = {}
    tracks_by_range: dict[str, list[dict[str, Any]]] = {}
    for time_range in RANGE_COPY:
        artists_by_range[time_range] = sp.current_user_top_artists(
            limit=50, time_range=time_range
        ).get("items", [])
        tracks_by_range[time_range] = sp.current_user_top_tracks(
            limit=50, time_range=time_range
        ).get("items", [])
    genres_complete, genre_index = enrich_artist_genres(
        artists_by_range, tracks_by_range, sp
    )
    families_by_range = {
        time_range: family_breakdown(artists)
        for time_range, artists in artists_by_range.items()
    }

    payloads: dict[str, dict[str, Any]] = {}
    comparison_ranges = {
        "short_term": "medium_term",
        "medium_term": "long_term",
        "long_term": "medium_term",
    }
    for selected_range, comparison_range in comparison_ranges.items():
        artists = artists_by_range[selected_range]
        tracks = tracks_by_range[selected_range]
        baseline_artists = artists_by_range[comparison_range]
        baseline_positions = {
            artist["id"]: index
            for index, artist in enumerate(baseline_artists)
            if artist.get("id")
        }
        label, description = RANGE_COPY[selected_range]
        comparison = ranking_comparison(artists, baseline_artists)
        comparison["label"] = RANGE_COPY[comparison_range][0]
        genres = genre_breakdown(artists)
        families = families_by_range[selected_range]
        track_families = track_family_breakdown(tracks, genre_index)
        data_science = ranked_track_statistics(
            tracks,
            genres,
            current_year=time.gmtime().tm_year,
        )
        genre_sample_size = min(20, len(artists))
        genre_sources = {
            artist.get("_genre_source")
            for artist in artists[:genre_sample_size]
            if artist.get("_genre_source")
        }
        genre_source = " + ".join(sorted(genre_sources)) or "Sin fuente disponible"

        artist_payload = []
        for index, artist in enumerate(artists[:50]):
            artist_payload.append(
                {
                    "name": artist.get("name", "Artista"),
                    "genre": artist_genre(artist),
                    "genres": (artist.get("genres") or [])[:3],
                    "genreSource": artist.get("_genre_source"),
                    "movement": rank_movement(
                        artist.get("id", ""), baseline_positions, index
                    ),
                    "image": image_url(artist),
                    "url": (artist.get("external_urls") or {}).get("spotify"),
                    "color": COLOR_PALETTE[index % len(COLOR_PALETTE)],
                }
            )

        track_payload = []
        for index, track in enumerate(tracks[:50]):
            album = track.get("album") or {}
            duration_ms = int(track.get("duration_ms") or 0)
            duration_seconds = max(0, round(duration_ms / 1000))
            duration_minutes, duration_remainder = divmod(duration_seconds, 60)
            release_date = str(album.get("release_date") or "")
            track_payload.append(
                {
                    "name": track.get("name", "CanciÃ³n"),
                    "artist": ", ".join(
                        artist.get("name", "")
                        for artist in track.get("artists") or []
                    ),
                    "image": image_url(album),
                    "url": (track.get("external_urls") or {}).get("spotify"),
                    "album": album.get("name") or "Ãlbum sin identificar",
                    "releaseYear": (
                        release_date[:4] if release_date[:4].isdigit() else None
                    ),
                    "duration": (
                        f"{duration_minutes}:{duration_remainder:02d}"
                        if duration_ms
                        else None
                    ),
                    "explicit": bool(track.get("explicit")),
                    "color": COLOR_PALETTE[index % len(COLOR_PALETTE)],
                }
            )

        unique_genres = {
            genre.casefold()
            for artist in artists[:genre_sample_size]
            for genre in artist.get("genres") or []
        }
        if genres:
            top_genre = genres[0]
            genre_insight = (
                f"{top_genre['name']} aparece en {top_genre['artistCount']} de "
                f"{genre_sample_size} artistas analizados. Fuente: {genre_source}."
            )
        else:
            genre_insight = (
                "No encontramos gÃ©neros verificables en Spotify ni MusicBrainz. "
                "No se muestran categorÃ­as de relleno."
            )

        payloads[selected_range] = {
            "range": selected_range,
            "label": label,
            "description": description,
            "profile": genre_profile(genres),
            "comparison": comparison,
            "analyzedTracks": len(tracks),
            "analyzedArtists": len(artists),
            "era": favorite_decade(tracks),
            "averageDuration": average_track_duration(tracks),
            "explicitShare": explicit_share(tracks),
            "genreCount": len(unique_genres),
            "genreSampleSize": genre_sample_size,
            "genreCoveredArtists": sum(bool(artist.get("genres")) for artist in artists[:genre_sample_size]),
            "genreSource": genre_source,
            "genreInsight": genre_insight,
            "genreLookupComplete": genres_complete,
            "genres": genres,
            "genreFamilies": families,
            "trackGenreFamilies": track_families,
            "tasteShift": taste_shift(families, families_by_range[comparison_range]),
            "rankStability": rank_biased_overlap(
                [str(artist.get("id") or "") for artist in artists],
                [str(artist.get("id") or "") for artist in baseline_artists],
            ),
            "trackRankStability": rank_biased_overlap(
                [str(track.get("id") or "") for track in tracks],
                [str(track.get("id") or "") for track in tracks_by_range[comparison_range]],
            ),
            "bridges": bridge_artists(artists),
            "genreCombos": family_combinations(artists),
            "dataScience": data_science,
            "artists": artist_payload,
            "tracks": track_payload,
            "insights": insight_cards(
                comparison,
                genres,
                tracks,
                genre_sample_size,
            ),
        }

    return payloads


app = FastAPI(
    title="Frecuencia API",
    description="Backend de Tu ADN musical, construido con Spotipy.",
    version="0.7.0",
    docs_url=None if IS_PRODUCTION else "/api/docs",
    redoc_url=None,
)

if ALLOWED_HOSTS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="frecuencia_session",
    same_site="lax",
    https_only=COOKIE_SECURE,
    max_age=60 * 60 * 24 * 30,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith(("/api/", "/auth/")):
        response.headers["Cache-Control"] = "private, no-store"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self'; "
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    )
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "spotify_configured": spotify_configured(),
        "storage": "redis" if redis_client is not None else "sqlite",
    }


@app.get("/api/auth/status")
def auth_status(request: Request, response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store"
    if not spotify_configured():
        return {"authenticated": False, "configured": False}
    oauth = oauth_for(request)
    token_info = oauth.cache_handler.get_cached_token()
    try:
        authenticated = bool(token_info and oauth.validate_token(token_info))
    except spotipy.oauth2.SpotifyOauthError as exc:
        if getattr(exc, "error", None) == "invalid_grant":
            oauth.cache_handler.delete()
            authenticated = False
        else:
            raise HTTPException(status_code=503, detail="Spotify no pudo validar la sesiÃ³n. ReintentÃ¡.") from exc
    profile = None
    if authenticated:
        try:
            user = spotify_client(request).current_user()
            images = user.get("images") or []
            profile = {
                "displayName": user.get("display_name") or user.get("id") or "Spotify",
                "username": user.get("id"),
                "image": images[0].get("url") if images else None,
                "url": (user.get("external_urls") or {}).get("spotify"),
            }
        except Exception:
            profile = None
    return {
        "authenticated": authenticated,
        "configured": True,
        "profile": profile,
    }


@app.get("/auth/login")
def login(request: Request) -> RedirectResponse:
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    request.session["oauth_started_at"] = int(time.time())
    authorization_url = oauth_for(request, state=state).get_authorize_url()
    return RedirectResponse(authorization_url, status_code=302)


@app.get("/auth/callback")
def callback(
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    if error:
        request.session.pop("oauth_state", None)
        request.session.pop("oauth_started_at", None)
        return RedirectResponse(
            "/?" + urlencode({"auth_error": "access_denied"}), status_code=302
        )

    expected_state = request.session.pop("oauth_state", None)
    started_at = request.session.pop("oauth_started_at", 0)
    state_expired = int(time.time()) - int(started_at or 0) > 600
    if (
        not state
        or not expected_state
        or state_expired
        or not secrets.compare_digest(state, expected_state)
    ):
        return RedirectResponse(
            "/?" + urlencode({"auth_error": "invalid_state"}), status_code=302
        )
    if not code:
        return RedirectResponse(
            "/?" + urlencode({"auth_error": "missing_code"}), status_code=302
        )

    try:
        oauth_for(request, state=state).get_access_token(code, check_cache=False)
    except Exception:
        return RedirectResponse(
            "/?" + urlencode({"auth_error": "token_exchange"}), status_code=302
        )
    return RedirectResponse("/?connected=1", status_code=302)


@app.post("/auth/logout")
def logout(request: Request) -> RedirectResponse:
    if request.headers.get("X-Frecuencia-Action") != "logout":
        raise HTTPException(status_code=403, detail="Solicitud de cierre de sesiÃ³n invÃ¡lida.")
    session_id = request.session.get("session_id")
    if session_id:
        token_cache_for(session_id).delete()
    request.session.clear()
    return RedirectResponse("/?logged_out=1", status_code=302)


@app.get("/api/insights")
def insights(
    request: Request,
    response: Response,
    range: str = Query(
        default="short_term", pattern="^(short_term|medium_term|long_term)$"
    ),
    refresh: bool = Query(default=False),
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "private, no-store"
    # Validate the token before serving personal data from the cache.
    sp = spotify_client(request)
    session_id = session_id_for(request)
    cached = None if refresh else cached_insights(session_id, range)
    if cached is not None:
        response.headers["X-Frecuencia-Cache"] = "HIT"
        return cached

    try:
        payloads = build_all_insights(sp)
        for time_range, time_range_payload in payloads.items():
            cache_insights(session_id, time_range, time_range_payload)
        response.headers["X-Frecuencia-Cache"] = "MISS"
        return payloads[range]
    except HTTPException:
        raise
    except spotipy.SpotifyException as exc:
        status_code = exc.http_status if exc.http_status in {401, 403, 429} else 502
        raise HTTPException(
            status_code=status_code,
            detail="Spotify no pudo responder en este momento.",
            headers={"Retry-After": str((exc.headers or {}).get("Retry-After", "30"))} if status_code == 429 else None,
        ) from exc


app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="site")
