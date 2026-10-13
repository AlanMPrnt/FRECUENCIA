import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

from fastapi import HTTPException
from fastapi.testclient import TestClient
from backend import main
from test_insights import FakeSpotify


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.patches = [
            patch.object(main, "DATABASE_PATH", Path(self.temp.name) / "test.db"),
            patch.object(main, "redis_client", None),
        ]
        for item in self.patches:
            item.start()
            self.addCleanup(item.stop)
        self.client = TestClient(main.app)

    def test_cached_data_still_requires_authentication(self):
        with patch.object(main, "cached_insights", return_value={"private": True}) as cache, patch.object(main, "spotify_client", side_effect=HTTPException(401)):
            response = self.client.get("/api/insights")
        self.assertEqual(response.status_code, 401)
        self.assertIn("no-store", response.headers["Cache-Control"])
        cache.assert_not_called()

    def test_logout_rejects_cross_site_form_and_get(self):
        self.assertIn(self.client.get("/auth/logout").status_code, (404, 405))
        self.assertEqual(self.client.post("/auth/logout").status_code, 403)
        response = self.client.post("/auth/logout", headers={"X-Frecuencia-Action": "logout"}, follow_redirects=False)
        self.assertEqual(response.status_code, 302)

    def test_full_insights_contract_and_cache(self):
        with patch.object(main, "spotify_client", return_value=FakeSpotify()), patch.object(main, "enrich_artist_genres", return_value=(True, {})):
            response = self.client.get("/api/insights?range=medium_term")
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["range"], "medium_term")
            self.assertEqual(payload["genreCoveredArtists"], 12)
            self.assertEqual(payload["dataScience"]["sampleSize"], 12)
            self.assertEqual(self.client.get("/api/insights?range=medium_term").headers["X-Frecuencia-Cache"], "HIT")

    def test_genre_outage_does_not_poison_cache(self):
        artists = {"short_term": [{"id": f"id{i}", "name": f"A{i}", "genres": []} for i in range(20)]}
        with patch.object(main, "musicbrainz_get", side_effect=main.MusicBrainzUnavailable("down")), patch.object(main, "cache_genre_record") as save:
            complete, index = main.enrich_artist_genres(artists)
        self.assertFalse(complete)
        save.assert_not_called()
        self.assertTrue(all(artist["genres"] == [] for artist in artists["short_term"]))

    def test_partial_genre_payload_is_cached_briefly(self):
        with patch.object(main, "spotify_client", return_value=FakeSpotify()), patch.object(main, "enrich_artist_genres", return_value=(False, {})):
            self.assertEqual(self.client.get("/api/insights").status_code, 200)
        with main.open_database() as connection:
            expires_at = connection.execute("SELECT MAX(expires_at) FROM spotify_insights").fetchone()[0]
        import time
        self.assertLessEqual(expires_at - time.time(), main.PARTIAL_INSIGHTS_TTL_SECONDS + 1)

    def test_homonyms_are_not_guessed(self):
        import json
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({"artists": [
            {"name": "Same", "tags": [{"name": "pop", "count": 10}]},
            {"name": "Same", "tags": [{"name": "metal", "count": 1}]}
        ]}).encode()
        with patch.object(main, "urlopen", return_value=response):
            self.assertEqual(main.musicbrainz_genres(["Same"]), {"same": []})

    def test_invalid_oauth_state_never_exchanges_code(self):
        with patch.object(main, "oauth_for") as oauth:
            response = self.client.get("/auth/callback?code=fictional&state=wrong", follow_redirects=False)
            self.assertIn("invalid_state", response.headers["location"])
            oauth.assert_not_called()

    def test_spotify_rate_limit_preserves_retry_hint(self):
        error = main.spotipy.SpotifyException(429, -1, "rate limited", headers={"Retry-After": "45"})
        with patch.object(main, "spotify_client", return_value=FakeSpotify()), patch.object(main, "build_all_insights", side_effect=error):
            response = self.client.get("/api/insights")
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["Retry-After"], "45")


if __name__ == "__main__":
    unittest.main()
