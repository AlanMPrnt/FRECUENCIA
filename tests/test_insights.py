from __future__ import annotations

import unittest

from backend.analytics import (
    average_track_duration,
    explicit_share,
    favorite_decade,
    genre_breakdown,
    ranked_track_statistics,
    ranking_comparison,
)


class FakeSpotify:
    def __init__(self) -> None:
        self.artists = [
            {
                "id": f"artist-{index}",
                "name": f"Artist {index}",
                "genres": ["indie pop", "art pop"],
                "images": [],
                "external_urls": {"spotify": f"https://spotify.com/artist/{index}"},
            }
            for index in range(12)
        ]
        self.tracks = [
            {
                "id": f"track-{index}",
                "name": f"Track {index}",
                "artists": [
                    {"id": f"artist-{index}", "name": f"Artist {index}"},
                    *(
                        [{"id": "guest", "name": "Guest Artist"}]
                        if index < 3
                        else []
                    ),
                ],
                "album": {
                    "id": "album-shared" if index < 4 else f"album-{index}",
                    "name": "Shared Album" if index < 4 else f"Album {index}",
                    "images": [],
                    "release_date": f"{2012 + index}-01-01",
                },
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
        self.assertEqual(favorite_decade(self.spotify.tracks), "2010s")
        self.assertEqual(average_track_duration(self.spotify.tracks), "3:00")
        self.assertEqual(explicit_share(self.spotify.tracks), 50)

    def test_empty_collections_have_safe_defaults(self) -> None:
        self.assertEqual(favorite_decade([]), "—")
        self.assertEqual(average_track_duration([]), "—")
        self.assertEqual(explicit_share([]), 0)

    def test_genre_breakdown_exposes_artist_counts(self) -> None:
        genres = genre_breakdown(self.spotify.artists, sample_size=10)
        self.assertEqual([item["name"] for item in genres], ["indie pop", "art pop"])
        self.assertEqual(genres[0]["artistCount"], 10)
        self.assertEqual(genres[0]["artistShare"], 100)
        self.assertEqual(genres[0]["weight"], 100)

    def test_rank_comparison_reports_membership_changes(self) -> None:
        baseline = [
            {"id": f"artist-{index}", "name": f"Artist {index}"}
            for index in range(6, 18)
        ]
        comparison = ranking_comparison(self.spotify.artists, baseline)
        self.assertEqual(comparison["sharedCount"], 6)
        self.assertEqual(comparison["enteredCount"], 6)
        self.assertEqual(comparison["exitedCount"], 6)
        self.assertEqual(comparison["entered"][0], "Artist 0")

    def test_ranked_track_statistics_are_interpretable(self) -> None:
        genres = genre_breakdown(self.spotify.artists, sample_size=12)
        statistics = ranked_track_statistics(
            self.spotify.tracks,
            genres,
            current_year=2026,
        )
        self.assertEqual(statistics["sampleSize"], 12)
        self.assertEqual(statistics["collaborationCount"], 3)
        self.assertEqual(statistics["collaborationShare"], 25)
        self.assertEqual(statistics["uniqueTrackArtists"], 13)
        self.assertEqual(statistics["uniqueAlbums"], 9)
        self.assertEqual(statistics["mostPresentAlbumCount"], 4)
        self.assertEqual(statistics["oldestReleaseYear"], 2012)
        self.assertEqual(statistics["newestReleaseYear"], 2023)
        self.assertEqual(statistics["effectiveGenreCount"], 2.0)


if __name__ == "__main__":
    unittest.main()
