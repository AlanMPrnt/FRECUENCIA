from __future__ import annotations

import unittest

from backend.analytics import (
    average_track_duration,
    explicit_share,
    favorite_decade,
    mainstream_score,
)


class FakeSpotify:
    def __init__(self) -> None:
        self.artists = [
            {
                "id": f"artist-{index}",
                "name": f"Artist {index}",
                "genres": ["indie pop", "art pop"],
                "popularity": 60,
                "images": [],
                "external_urls": {"spotify": f"https://spotify.com/artist/{index}"},
            }
            for index in range(12)
        ]
        self.tracks = [
            {
                "id": f"track-{index}",
                "name": f"Track {index}",
                "artists": [{"id": f"artist-{index}", "name": f"Artist {index}"}],
                "album": {"images": [], "release_date": "2022-01-01"},
                "popularity": 40,
                "duration_ms": 180_000,
                "explicit": index % 2 == 0,
                "external_urls": {"spotify": f"https://spotify.com/track/{index}"},
            }
            for index in range(12)
        ]

    def current_user_top_artists(self, **_: object) -> dict[str, list[dict]]:
        return {"items": self.artists}

    def current_user_top_tracks(self, **_: object) -> dict[str, list[dict]]:
        return {"items": self.tracks}


class InsightMetricsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.spotify = FakeSpotify()

    def test_metric_helpers(self) -> None:
        self.assertEqual(
            mainstream_score(self.spotify.artists, self.spotify.tracks), 50
        )
        self.assertEqual(favorite_decade(self.spotify.tracks), "2020s")
        self.assertEqual(average_track_duration(self.spotify.tracks), "3:00")
        self.assertEqual(explicit_share(self.spotify.tracks), 50)

    def test_empty_collections_have_safe_defaults(self) -> None:
        self.assertEqual(mainstream_score([], []), 0)
        self.assertEqual(favorite_decade([]), "—")
        self.assertEqual(average_track_duration([]), "—")
        self.assertEqual(explicit_share([]), 0)


if __name__ == "__main__":
    unittest.main()
