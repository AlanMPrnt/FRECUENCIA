from __future__ import annotations

import json
import os
import secrets
import sqlite3
from collections import Counter
from pathlib import Path
from typing import Any

import spotipy
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from spotipy.cache_handler import CacheHandler
from spotipy.oauth2 import SpotifyOAuth
from starlette.middleware.sessions import SessionMiddleware


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DIST_DIR = ROOT / "dist"
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", DATA_DIR / "frecuencia.db"))

CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID", "").strip()
CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET", "").strip()
REDIRECT_URI = os.getenv(
    "SPOTIPY_REDIRECT_URI", "http://127.0.0.1:8000/auth/callback"
).strip()
SESSION_SECRET = os.getenv("SESSION_SECRET", "change-me-in-development")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
SCOPES = "user-top-read"

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


def spotify_configured() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET and REDIRECT_URI)


def open_database() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS spotify_tokens (
            session_id TEXT PRIMARY KEY,
            token_info TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return connection


class SQLiteTokenCache(CacheHandler):
    """Stores OAuth tokens server-side instead of exposing them in the browser cookie."""

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
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(session_id) DO UPDATE SET
                    token_info = excluded.token_info,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (self.session_id, json.dumps(token_info)),
            )

    def delete(self) -> None:
        with open_database() as connection:
            connection.execute(
                "DELETE FROM spotify_tokens WHERE session_id = ?", (self.session_id,)
            )


def session_id_for(request: Request) -> str:
    session_id = request.session.get("session_id")
    if not session_id:
        session_id = secrets.token_urlsafe(24)
        request.session["session_id"] = session_id
    return session_id


def oauth_for(request: Request, *, state: str | None = None) -> SpotifyOAuth:
    if not spotify_configured():
        raise HTTPException(
            status_code=503,
            detail="Faltan las credenciales de Spotify en el archivo .env.",
        )
    return SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        scope=SCOPES,
        state=state,
        cache_handler=SQLiteTokenCache(session_id_for(request)),
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
    except Exception as exc:  # Spotipy exposes several OAuth error subclasses.
        raise HTTPException(status_code=401, detail="La sesión de Spotify expiró.") from exc
    if not token:
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
    pattern_title = "Tu escucha cruza escenas" if diversity >= 70 else "Afinidad concentrada"
    pattern_copy = f"{top_genre.capitalize()} convive con {second_genre} dentro de tu selección principal."
    signature_title = "Identidad en movimiento" if change >= 25 else "Una firma reconocible"
    signature_copy = (
        f"Un {change}% de tu núcleo cambia al compararlo con un período más amplio."
    )
    return [
        [discovery_title, discovery_copy],
        [pattern_title, pattern_copy],
        [signature_title, signature_copy],
    ]


def build_insights(sp: spotipy.Spotify, selected_range: str) -> dict[str, Any]:
    artists_by_range: dict[str, list[dict[str, Any]]] = {}
    tracks_by_range: dict[str, list[dict[str, Any]]] = {}
    for time_range in RANGE_COPY:
        artists_by_range[time_range] = sp.current_user_top_artists(
            limit=50, time_range=time_range
        ).get("items", [])
        tracks_by_range[time_range] = sp.current_user_top_tracks(
            limit=50, time_range=time_range
        ).get("items", [])

    comparison_range = {
        "short_term": "medium_term",
        "medium_term": "long_term",
        "long_term": "medium_term",
    }[selected_range]
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
    for index, artist in enumerate(artists[:5]):
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
    for index, track in enumerate(tracks[:5]):
        album = track.get("album") or {}
        track_payload.append(
            {
                "name": track.get("name", "Canción"),
                "artist": ", ".join(
                    artist.get("name", "") for artist in track.get("artists") or []
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
        f"Tu núcleo cambió un {change}% frente a {RANGE_COPY[comparison_range][0].lower()}. "
        f"Hay {new_artist_count} artistas que ganaron protagonismo."
    )
    genre_insight = (
        f"{top_genre.capitalize()} es el hilo que más conecta a tus artistas favoritos."
    )

    return {
        "range": selected_range,
        "label": label,
        "description": description,
        "profile": profile_name(diversity, genres),
        "diversity": diversity,
        "change": change,
        "changeNote": change_note,
        "genreCount": len(unique_genres),
        "genreInsight": genre_insight,
        "genres": genres,
        "artists": artist_payload,
        "tracks": track_payload,
        "insights": insight_copy(diversity, change, genres, new_artist_count),
    }


app = FastAPI(
    title="Frecuencia API",
    description="Backend de Tu ADN musical, construido con Spotipy.",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="lax",
    https_only=COOKIE_SECURE,
    max_age=60 * 60 * 24 * 30,
)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "spotify_configured": spotify_configured()}


@app.get("/api/auth/status")
def auth_status(request: Request) -> dict[str, Any]:
    if not spotify_configured():
        return {"authenticated": False, "configured": False}
    oauth = oauth_for(request)
    token_info = oauth.cache_handler.get_cached_token()
    try:
        authenticated = bool(token_info and oauth.validate_token(token_info))
    except Exception:
        authenticated = False
    return {"authenticated": authenticated, "configured": True}


@app.get("/auth/login")
def login(request: Request) -> RedirectResponse:
    state = secrets.token_urlsafe(24)
    request.session["oauth_state"] = state
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
        raise HTTPException(status_code=400, detail=f"Spotify rechazó el acceso: {error}")
    expected_state = request.session.pop("oauth_state", None)
    if not state or not expected_state or not secrets.compare_digest(state, expected_state):
        raise HTTPException(status_code=400, detail="El estado OAuth no es válido.")
    if not code:
        raise HTTPException(status_code=400, detail="Spotify no devolvió un código OAuth.")
    oauth_for(request, state=state).get_access_token(code, check_cache=False)
    return RedirectResponse("/?connected=1", status_code=302)


@app.get("/auth/logout")
def logout(request: Request) -> RedirectResponse:
    session_id = request.session.get("session_id")
    if session_id:
        SQLiteTokenCache(session_id).delete()
    request.session.clear()
    return RedirectResponse("/", status_code=302)


@app.get("/api/insights")
def insights(
    request: Request,
    range: str = Query(default="short_term", pattern="^(short_term|medium_term|long_term)$"),
) -> dict[str, Any]:
    try:
        return build_insights(spotify_client(request), range)
    except HTTPException:
        raise
    except spotipy.SpotifyException as exc:
        status_code = exc.http_status if exc.http_status in {401, 403, 429} else 502
        raise HTTPException(
            status_code=status_code,
            detail="Spotify no pudo responder en este momento.",
        ) from exc


app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="site")
