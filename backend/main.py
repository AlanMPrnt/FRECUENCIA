from __future__ import annotations

import json
import os
import secrets
import sqlite3
import time
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

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
    mainstream_score,
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
SCOPES = "user-top-read"

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
            *(f"frecuencia:insights:{self.session_id}:{item}" for item in RANGE_COPY),
        ]
        self.client.delete(*keys)


def token_cache_for(session_id: str) -> CacheHandler:
    if redis_client is not None:
        return RedisTokenCache(session_id, redis_client)
    return SQLiteTokenCache(session_id)


def cached_insights(session_id: str, time_range: str) -> dict[str, Any] | None:
    if redis_client is not None:
        value = redis_client.get(f"frecuencia:insights:{session_id}:{time_range}")
        return json.loads(value) if value else None

    now = int(time.time())
    with open_database() as connection:
        row = connection.execute(
            """
            SELECT payload FROM spotify_insights
            WHERE session_id = ? AND time_range = ? AND expires_at > ?
            """,
            (session_id, time_range, now),
        ).fetchone()
        connection.execute(
            "DELETE FROM spotify_insights WHERE expires_at <= ?", (now,)
        )
    return json.loads(row[0]) if row else None


def cache_insights(
    session_id: str, time_range: str, payload: dict[str, Any]
) -> None:
    serialized = json.dumps(payload, ensure_ascii=False)
    if redis_client is not None:
        redis_client.setex(
            f"frecuencia:insights:{session_id}:{time_range}",
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
                time_range,
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


def image_url(item: dict[str, Any]) -> str | None:
    images = item.get("images") or []
    return images[0].get("url") if images else None


def artist_genre(artist: dict[str, Any]) -> str:
    genres = artist.get("genres") or []
    return genres[0] if genres else "sin género principal"


def rank_movement(
    current_id: str, baseline_positions: dict[str, int], current_index: int
) -> int:
    baseline_index = baseline_positions.get(current_id)
    if baseline_index is None:
        return min(8, max(1, 8 - current_index))
    return baseline_index - current_index


def weighted_genres(artists: list[dict[str, Any]]) -> list[list[Any]]:
    genre_scores: Counter[str] = Counter()
    for index, artist in enumerate(artists):
        weight = max(1, len(artists) - index)
        for genre in artist.get("genres") or []:
            genre_scores[genre] += weight
    top = genre_scores.most_common(10)
    if not top:
        return [["sin categoría", 8]]
    highest = top[0][1]
    return [[genre, round(5 + score / highest * 17)] for genre, score in top]


def diversity_score(
    artists: list[dict[str, Any]], tracks: list[dict[str, Any]]
) -> int:
    track_artist_ids = {
        artist.get("id")
        for track in tracks
        for artist in track.get("artists") or []
        if artist.get("id")
    }
    unique_genres = {
        genre for artist in artists for genre in artist.get("genres") or []
    }
    artist_component = len(track_artist_ids) / max(len(tracks), 1)
    genre_component = min(len(unique_genres), 24) / 24
    return min(99, round(artist_component * 72 + genre_component * 28))


def taste_change(current_ids: list[str], baseline_ids: list[str]) -> int:
    current = set(current_ids[:20])
    baseline = set(baseline_ids[:20])
    union = current | baseline
    if not union:
        return 0
    return round((1 - len(current & baseline) / len(union)) * 100)


def profile_name(diversity: int, genres: list[list[Any]]) -> str:
    names = " ".join(genre[0] for genre in genres[:4]).lower()
    if diversity >= 80:
        return "Curioso y expansivo"
    if "elect" in names or "dance" in names:
        return "Nocturno y cinético"
    if "r&b" in names or "soul" in names:
        return "Íntimo y magnético"
    if "rock" in names or "indie" in names:
        return "Inquieto y melódico"
    return "Ecléctico y emocional"


def insight_copy(
    diversity: int, change: int, genres: list[list[Any]], new_artist_count: int
) -> list[list[str]]:
    top_genre = genres[0][0] if genres else "tu sonido principal"
    second_genre = genres[1][0] if len(genres) > 1 else "otros territorios"
    discovery_title = (
        "Más curioso que de costumbre"
        if new_artist_count >= 5
        else "Tu núcleo sigue firme"
    )
    discovery_copy = (
        f"{new_artist_count} artistas aparecen con más fuerza que en el período anterior."
        if new_artist_count
        else "Tus artistas principales se mantienen estables en el tiempo."
    )
    pattern_title = (
        "Tu escucha cruza escenas" if diversity >= 70 else "Afinidad concentrada"
    )
    pattern_copy = f"{top_genre.capitalize()} convive con {second_genre} dentro de tu selección principal."
    signature_title = (
        "Identidad en movimiento" if change >= 25 else "Una firma reconocible"
    )
    signature_copy = (
        f"Un {change}% de tu núcleo cambia al compararlo con un período más amplio."
    )
    return [
        [discovery_title, discovery_copy],
        [pattern_title, pattern_copy],
        [signature_title, signature_copy],
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
        current_ids = [artist.get("id", "") for artist in artists]
        baseline_ids = [artist.get("id", "") for artist in baseline_artists]
        genres = weighted_genres(artists)
        diversity = diversity_score(artists, tracks)
        change = taste_change(current_ids, baseline_ids)
        new_artist_count = len(set(current_ids[:20]) - set(baseline_ids[:20]))
        label, description = RANGE_COPY[selected_range]

        artist_payload = []
        for index, artist in enumerate(artists[:10]):
            artist_payload.append(
                {
                    "name": artist.get("name", "Artista"),
                    "genre": artist_genre(artist),
                    "movement": rank_movement(
                        artist.get("id", ""), baseline_positions, index
                    ),
                    "image": image_url(artist),
                    "url": (artist.get("external_urls") or {}).get("spotify"),
                    "color": COLOR_PALETTE[index % len(COLOR_PALETTE)],
                }
            )

        track_payload = []
        for index, track in enumerate(tracks[:10]):
            album = track.get("album") or {}
            track_payload.append(
                {
                    "name": track.get("name", "Canción"),
                    "artist": ", ".join(
                        artist.get("name", "")
                        for artist in track.get("artists") or []
                    ),
                    "image": image_url(album),
                    "url": (track.get("external_urls") or {}).get("spotify"),
                    "color": COLOR_PALETTE[index % len(COLOR_PALETTE)],
                }
            )

        unique_genres = {
            genre for artist in artists for genre in artist.get("genres") or []
        }
        top_genre = genres[0][0] if genres else "tu género principal"
        change_note = (
            f"Tu núcleo cambió un {change}% frente a "
            f"{RANGE_COPY[comparison_range][0].lower()}. "
            f"Hay {new_artist_count} artistas que ganaron protagonismo."
        )
        genre_insight = (
            f"{top_genre.capitalize()} es el hilo que más conecta a tus artistas "
            "favoritos."
        )

        payloads[selected_range] = {
            "range": selected_range,
            "label": label,
            "description": description,
            "profile": profile_name(diversity, genres),
            "diversity": diversity,
            "change": change,
            "changeNote": change_note,
            "mainstream": mainstream_score(artists, tracks),
            "era": favorite_decade(tracks),
            "averageDuration": average_track_duration(tracks),
            "explicitShare": explicit_share(tracks),
            "genreCount": len(unique_genres),
            "genreInsight": genre_insight,
            "genres": genres,
            "artists": artist_payload,
            "tracks": track_payload,
            "insights": insight_copy(diversity, change, genres, new_artist_count),
        }

    return payloads


app = FastAPI(
    title="Frecuencia API",
    description="Backend de Tu ADN musical, construido con Spotipy.",
    version="0.3.0",
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
    return {"authenticated": authenticated, "configured": True}


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
