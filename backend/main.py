from __future__ import annotations

import json
import os
import re
import secrets
import sqlite3
import time
import unicodedata
from pathlib import Path
from typing import Any
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
    explicit_share,
    favorite_decade,
    genre_breakdown,
    ranked_track_statistics,
    ranking_comparison,
)


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
CACHE_SCHEMA_VERSION = "v3"
SCOPES = "user-top-read user-read-private"
MUSICBRAINZ_API = "https://musicbrainz.org/ws/2/artist/"
MUSICBRAINZ_USER_AGENT = os.getenv(
    "MUSICBRAINZ_USER_AGENT",
    "Frecuencia/0.5 (https://github.com/AlanMPrnt/FRECUENCIA)",
)

if IS_PRODUCTION:
    missing = []
    if not CLIENT_ID:
        missing.append("SPOTIPY_CLIENT_ID")
    if not CLIENT_SECRET:
        missing.append("SPOTIPY_CLIENT_SECRET")
    if not REDIRECT_URI:
        missing.append("SPOTIPY_REDIRECT_URI")
    if len(SESSION_SECRET) < 32 or SESSION_SECRET == "change-me-in-development":
        missing.append("SESSION_SECRET (mínimo 32 caracteres)")
    if REDIRECT_URI and not REDIRECT_URI.startswith("https://"):
        missing.append("SPOTIPY_REDIRECT_URI debe usar HTTPS en producción")
    if missing:
        raise RuntimeError(
            "Configuración de producción incompleta: " + ", ".join(missing)
        )

RANGE_COPY = {
    "short_term": ("Ahora", "Lo que más te definió durante las últimas 4 semanas."),
    "medium_term": (
        "Últimos 6 meses",
        "La música que sostuvo tu ritmo durante los últimos 6 meses.",
    ),
    "long_term": ("Último año", "Los nombres y sonidos que construyeron tu último año."),
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


def open_database() -> sqlite3.Connection:
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
    return connection


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
    if redis_client is not None:
        redis_client.setex(
            f"frecuencia:insights:{CACHE_SCHEMA_VERSION}:{session_id}:{time_range}",
            INSIGHTS_CACHE_TTL_SECONDS,
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
                int(time.time()) + INSIGHTS_CACHE_TTL_SECONDS,
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
            detail="La conexión con Spotify todavía no está configurada.",
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
        raise HTTPException(status_code=401, detail="Conectá tu cuenta de Spotify.")
    try:
        token = oauth.validate_token(token_info)
    except Exception as exc:
        oauth.cache_handler.delete()
        raise HTTPException(status_code=401, detail="La sesión de Spotify expiró.") from exc
    if not token:
        oauth.cache_handler.delete()
        raise HTTPException(status_code=401, detail="La sesión de Spotify expiró.")
    return spotipy.Spotify(auth_manager=oauth, requests_timeout=10, retries=2)


GENRE_ALIASES = {
    "hip-hop": "hip hop",
    "hiphop": "hip hop",
    "synthpop": "synth-pop",
    "rnb": "R&B",
    "r&b": "R&B",
    "rhythm and blues": "R&B",
    "neo psychedelic": "neo-psychedelia",
    "neo-psychedelic": "neo-psychedelia",
    "electronica": "electrónica",
    "electronic": "electrónica",
    "latin trap": "trap latino",
    "argentine rock": "rock argentino",
    "argentinian rock": "rock argentino",
}
GENRE_KEYWORDS = (
    "ambient",
    "alternative",
    "art pop",
    "blues",
    "classical",
    "cumbia",
    "dance",
    "disco",
    "dream pop",
    "electro",
    "emo",
    "experimental",
    "folk",
    "funk",
    "garage",
    "gospel",
    "grunge",
    "hardcore",
    "hip hop",
    "hip-hop",
    "house",
    "indie",
    "jazz",
    "latin",
    "metal",
    "neo-psy",
    "new wave",
    "pop",
    "post-punk",
    "post-rock",
    "psychedelic",
    "punk",
    "rap",
    "reggae",
    "reggaeton",
    "rock",
    "salsa",
    "shoegaze",
    "ska",
    "soul",
    "synth",
    "tango",
    "techno",
    "trap",
    "trip hop",
    "urbano",
)


def normalize_artist_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(
        character for character in normalized if not unicodedata.combining(character)
    )
    return re.sub(r"[^a-z0-9]+", " ", without_accents.casefold()).strip()


def canonical_genre(value: str) -> str | None:
    genre = re.sub(r"\s+", " ", value.strip().casefold())
    if not genre:
        return None
    if genre in GENRE_ALIASES:
        return GENRE_ALIASES[genre]
    if not any(keyword in genre for keyword in GENRE_KEYWORDS):
        return None
    return genre


def cached_artist_genres(artist_name: str) -> list[str] | None:
    artist_key = normalize_artist_key(artist_name)
    if redis_client is not None:
        value = redis_client.get(f"frecuencia:genres:{artist_key}")
        return json.loads(value) if value is not None else None

    now = int(time.time())
    with open_database() as connection:
        row = connection.execute(
            "SELECT genres FROM artist_genres WHERE artist_key = ? AND expires_at > ?",
            (artist_key, now),
        ).fetchone()
    return json.loads(row[0]) if row else None


def cache_artist_genres(artist_name: str, genres: list[str]) -> None:
    artist_key = normalize_artist_key(artist_name)
    serialized = json.dumps(genres, ensure_ascii=False)
    if redis_client is not None:
        redis_client.setex(
            f"frecuencia:genres:{artist_key}",
            GENRE_CACHE_TTL_SECONDS,
            serialized,
        )
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
            (
                artist_key,
                serialized,
                int(time.time()) + GENRE_CACHE_TTL_SECONDS,
            ),
        )


def musicbrainz_genres(artist_names: list[str]) -> dict[str, list[str]]:
    if not artist_names:
        return {}
    clauses = []
    for name in artist_names[:24]:
        escaped = name.replace("\\", "\\\\").replace('"', '\\"')
        clauses.append(f'artist:"{escaped}"')
    query = " OR ".join(clauses)
    url = f"{MUSICBRAINZ_API}?{urlencode({'query': query, 'fmt': 'json', 'limit': 100})}"
    request = URLRequest(url, headers={"User-Agent": MUSICBRAINZ_USER_AGENT})
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return {}

    candidates: dict[str, list[dict[str, Any]]] = {}
    queried_names = artist_names[:24]
    requested_keys = {normalize_artist_key(name) for name in queried_names}
    for artist in payload.get("artists") or []:
        key = normalize_artist_key(str(artist.get("name") or ""))
        if key in requested_keys:
            candidates.setdefault(key, []).append(artist)

    results: dict[str, list[str]] = {}
    for name in queried_names:
        key = normalize_artist_key(name)
        matches = candidates.get(key) or []
        if not matches:
            results[key] = []
            continue
        best = max(
            matches,
            key=lambda item: (
                sum(max(0, int(tag.get("count") or 0)) for tag in item.get("tags") or []),
                int(item.get("score") or 0),
            ),
        )
        raw_tags = [*(best.get("genres") or []), *(best.get("tags") or [])]
        raw_tags.sort(key=lambda tag: int(tag.get("count") or 0), reverse=True)
        verified = []
        for tag in raw_tags:
            genre = canonical_genre(str(tag.get("name") or ""))
            if genre and genre.casefold() not in {item.casefold() for item in verified}:
                verified.append(genre)
            if len(verified) == 4:
                break
        results[key] = verified
    return results


def enrich_artist_genres(
    artists_by_range: dict[str, list[dict[str, Any]]]
) -> None:
    candidates: dict[str, str] = {}
    for artists in artists_by_range.values():
        for artist in artists[:15]:
            name = str(artist.get("name") or "").strip()
            if name and not artist.get("genres"):
                candidates.setdefault(normalize_artist_key(name), name)

    unresolved = []
    genre_map: dict[str, list[str]] = {}
    for key, name in candidates.items():
        cached = cached_artist_genres(name)
        if cached is None:
            unresolved.append(name)
        else:
            genre_map[key] = cached

    queried_names = unresolved[:24]
    discovered = musicbrainz_genres(queried_names)
    for name in queried_names:
        genres = discovered.get(normalize_artist_key(name), [])
        genre_map[normalize_artist_key(name)] = genres
        cache_artist_genres(name, genres)

    for artists in artists_by_range.values():
        for artist in artists:
            if artist.get("genres"):
                artist["_genre_source"] = "Spotify"
                continue
            genres = genre_map.get(normalize_artist_key(str(artist.get("name") or "")), [])
            artist["genres"] = genres
            if genres:
                artist["_genre_source"] = "MusicBrainz"


def image_url(item: dict[str, Any]) -> str | None:
    images = item.get("images") or []
    return images[0].get("url") if images else None


def artist_genre(artist: dict[str, Any]) -> str:
    genres = artist.get("genres") or []
    return genres[0] if genres else "género no verificado"


def rank_movement(
    current_id: str, baseline_positions: dict[str, int], current_index: int
) -> int | None:
    baseline_index = baseline_positions.get(current_id)
    if baseline_index is None:
        return None
    return baseline_index - current_index


def genre_profile(genres: list[dict[str, Any]]) -> str:
    if not genres:
        return "Géneros por verificar"
    if len(genres) == 1:
        return genres[0]["name"]
    return f"{genres[0]['name']} × {genres[1]['name']}"


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
            f"También aparecen: {next_genres}.",
            "Los géneros describen artistas; no son minutos ni reproducciones.",
        ]
    else:
        pattern_title = "Todavía no hay géneros verificados"
        pattern_copy = (
            "Spotify no entregó categorías y MusicBrainz no pudo completar "
            "esta selección."
        )
        pattern_facts = [
            "No mostramos etiquetas de relleno.",
            "Probá Actualizar más tarde para volver a consultar la fuente externa.",
        ]

    signature_facts = [
        f"Década con más canciones: {favorite_decade(tracks)}.",
        f"Duración media: {average_track_duration(tracks)}.",
        f"Contenido explícito: {explicit_share(tracks)}% del Top {len(tracks)}.",
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
            "title": "Tu selección, sin adjetivos inventados",
            "copy": "Tres medidas observables dentro de las canciones que Spotify devolvió.",
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
    enrich_artist_genres(artists_by_range)

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
                    "name": track.get("name", "Canción"),
                    "artist": ", ".join(
                        artist.get("name", "")
                        for artist in track.get("artists") or []
                    ),
                    "image": image_url(album),
                    "url": (track.get("external_urls") or {}).get("spotify"),
                    "album": album.get("name") or "Álbum sin identificar",
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
                "No encontramos géneros verificables en Spotify ni MusicBrainz. "
                "No se muestran categorías de relleno."
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
            "genreSource": genre_source,
            "genreInsight": genre_insight,
            "genres": genres,
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
    version="0.5.0",
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
    except Exception:
        oauth.cache_handler.delete()
        authenticated = False
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


@app.get("/auth/logout")
def logout(request: Request) -> RedirectResponse:
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
    session_id = session_id_for(request)
    cached = None if refresh else cached_insights(session_id, range)
    if cached is not None:
        response.headers["X-Frecuencia-Cache"] = "HIT"
        return cached

    try:
        payloads = build_all_insights(spotify_client(request))
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
        ) from exc


app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="site")
