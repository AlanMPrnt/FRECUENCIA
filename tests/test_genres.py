from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend import main
from backend.analytics import (
    bridge_artists,
    family_breakdown,
    family_combinations,
    jensen_shannon_distance,
    rank_biased_overlap,
    taste_shift,
    track_family_breakdown,
)
from backend.genres import genre_family, genres_from_tags, is_known_genre

BAD_BUNNY_MBID = "89aa5ecb-59ad-46f5-b3eb-2d424e941f19"
DUKI_MBID = "44869536-0262-4f22-9c23-b4821c13cd97"

# Tag counts as returned by MusicBrainz on 2026-10-13.
DUKI_TAGS = [
    {"name": "hip hop", "count": 3}, {"name": "pop rock", "count": 1},
    {"name": "latin", "count": 3}, {"name": "trap latino", "count": 4},
    {"name": "argentine trap", "count": 2}, {"name": "spanish", "count": 0},
]
BAD_BUNNY_TAGS = [
    {"name": "pop", "count": 0}, {"name": "hip hop", "count": 1},
    {"name": "latin", "count": 3}, {"name": "reggaeton", "count": 7},
    {"name": "latin trap", "count": 3}, {"name": "trap latino", "count": 5},
]


class GenreVocabularyTests(unittest.TestCase):
    def test_vocabulary_includes_local_scenes(self):
        for genre in ("cuarteto", "rkt", "dembow", "cumbia villera", "drill", "trap latino"):
            self.assertTrue(is_known_genre(genre), genre)
        self.assertFalse(is_known_genre("spanish"))

    def test_tags_need_real_votes(self):
        self.assertEqual(genres_from_tags(DUKI_TAGS), ["trap latino", "hip hop", "latin", "trap argentino"])
        # "latin trap" folds into "trap latino"; one-vote "hip hop" is noise next to 7 votes.
        self.assertEqual(genres_from_tags(BAD_BUNNY_TAGS), ["reggaeton", "trap latino", "latin"])

    def test_families_prefer_specific_scenes(self):
        expected = {
            "cuarteto": "Cumbia y tropical",
            "rkt": "Urbano latino",
            "trap latino": "Urbano latino",
            "trap": "Hip hop y rap",
            "dubstep": "Electrónica",
            "dub": "Reggae y ska",
            "post-punk": "Rock",
            "pop punk": "Punk y hardcore",
            "rocksteady": "Reggae y ska",
            "k-pop": "Pop",
            "bossa nova": "Música brasileña",
            "chacarera": "Tango y folklore",
            "R&B": "R&B y soul",
        }
        for genre, family in expected.items():
            self.assertEqual(genre_family(genre), family, genre)
        self.assertIsNone(genre_family("latin"))


class FakeMusicBrainz:
    """Answers MusicBrainz paths like the real service, counting the calls."""

    def __init__(self, links: dict[str, str], tags: dict[str, list[dict]], by_name=None):
        self.links, self.tags, self.by_name = links, tags, by_name or {}
        self.calls: list[str] = []

    def __call__(self, path, params):
        self.calls.append(path)
        values = dict(params)
        if path == "url":
            resources = [value for key, value in params if key == "resource"]
            urls = []
            for resource in resources:
                spotify_id = resource.rsplit("/", 1)[1]
                if spotify_id in self.links:
                    urls.append({"resource": resource, "relations": [{"artist": {"id": self.links[spotify_id]}}]})
            return {"urls": urls}
        if "arid:" in values["query"]:
            return {"artists": [{"id": mbid, "tags": tags} for mbid, tags in self.tags.items() if mbid in values["query"]]}
        return {"artists": [{"name": name, "tags": tags} for name, tags in self.by_name.items() if name in values["query"]]}


class GenrePipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        for item in (
            patch.object(main, "DATABASE_PATH", Path(self.temp.name) / "test.db"),
            patch.object(main, "redis_client", None),
        ):
            item.start()
            self.addCleanup(item.stop)

    def test_exact_spotify_link_beats_name_search(self):
        fake = FakeMusicBrainz({"bb": BAD_BUNNY_MBID, "duki": DUKI_MBID}, {BAD_BUNNY_MBID: BAD_BUNNY_TAGS, DUKI_MBID: DUKI_TAGS})
        artists = {"short_term": [{"id": "bb", "name": "Bad Bunny"}, {"id": "duki", "name": "Duki"}]}
        tracks = {"short_term": [{"id": "t1", "name": "Song", "artists": [{"id": "duki", "name": "Duki"}]}]}
        with patch.object(main, "musicbrainz_get", side_effect=fake):
            complete, index = main.enrich_artist_genres(artists, tracks)
        self.assertTrue(complete)
        self.assertEqual(fake.calls, ["url", "artist"], "one batched link lookup and one batched tag lookup")
        self.assertEqual(artists["short_term"][0]["genres"][0], "reggaeton")
        self.assertEqual(artists["short_term"][1]["_genre_source"], "MusicBrainz")
        self.assertEqual(index["duki"][0], "trap latino")

        # Second visit is served from the cache, without network calls.
        fresh = {"short_term": [{"id": "bb", "name": "Bad Bunny"}]}
        with patch.object(main, "musicbrainz_get", side_effect=AssertionError("no network")):
            self.assertTrue(main.enrich_artist_genres(fresh)[0])
        self.assertEqual(fresh["short_term"][0]["genres"][0], "reggaeton")

    def test_unlinked_artist_falls_back_to_unambiguous_name(self):
        fake = FakeMusicBrainz({}, {}, by_name={"Banda Local": [{"name": "cuarteto", "count": 2}]})
        artists = {"short_term": [{"id": "x", "name": "Banda Local"}]}
        with patch.object(main, "musicbrainz_get", side_effect=fake):
            main.enrich_artist_genres(artists)
        self.assertEqual(artists["short_term"][0]["genres"], ["cuarteto"])
        self.assertEqual(artists["short_term"][0]["_genre_source"], "MusicBrainz por nombre")

    def test_spotify_artist_endpoint_is_probed_once(self):
        class Spotify:
            calls = 0

            def artist(self, _):
                Spotify.calls += 1
                return {"id": "a", "name": "A"}  # February 2026 shape: no genres key.

        fake = FakeMusicBrainz({}, {})
        artists = {"short_term": [{"id": f"id{i}", "name": f"A{i}"} for i in range(5)]}
        with patch.object(main, "musicbrainz_get", side_effect=fake):
            main.enrich_artist_genres(artists, sp=Spotify())
            self.assertEqual(Spotify.calls, 1)
            main.enrich_artist_genres({"short_term": [{"id": "new", "name": "New"}]}, sp=Spotify())
        self.assertEqual(Spotify.calls, 1, "the negative probe is remembered")

    def test_spotify_artist_genres_are_used_when_available(self):
        class Spotify:
            def artist(self, spotify_id):
                return {"id": spotify_id, "genres": ["argentine rock"]}

        artists = {"short_term": [{"id": "soda", "name": "Soda Stereo"}]}
        with patch.object(main, "musicbrainz_get", side_effect=AssertionError("not needed")):
            main.enrich_artist_genres(artists, sp=Spotify())
        self.assertEqual(artists["short_term"][0]["genres"], ["rock argentino"])
        self.assertEqual(artists["short_term"][0]["_genre_source"], "Spotify")

    def test_budget_cut_reports_incomplete(self):
        fake = FakeMusicBrainz({}, {})
        artists = {"short_term": [{"id": "a", "name": "A"}]}
        with patch.object(main, "GENRE_LOOKUP_BUDGET_SECONDS", -1), patch.object(main, "musicbrainz_get", side_effect=fake):
            complete, _ = main.enrich_artist_genres(artists)
        self.assertFalse(complete)
        self.assertEqual(fake.calls, [])


def artist(name, *genres):
    return {"id": name, "name": name, "genres": list(genres)}


class AdvancedAnalyticsTests(unittest.TestCase):
    def test_rank_biased_overlap_rewards_agreement_at_the_top(self):
        ranking = [f"a{i}" for i in range(20)]
        self.assertEqual(rank_biased_overlap(ranking, ranking), 100)
        self.assertEqual(rank_biased_overlap(ranking, [f"b{i}" for i in range(20)]), 0)
        top_changed = ["x", *ranking[1:]]
        bottom_changed = [*ranking[:-1], "x"]
        self.assertLess(rank_biased_overlap(top_changed, ranking), rank_biased_overlap(bottom_changed, ranking))
        self.assertIsNone(rank_biased_overlap([], ranking))

    def test_jensen_shannon_distance_bounds(self):
        self.assertEqual(jensen_shannon_distance({"a": 1.0}, {"a": 1.0}), 0)
        self.assertAlmostEqual(jensen_shannon_distance({"a": 1.0}, {"b": 1.0}), 1.0)

    def test_family_mix_shift_and_bridges(self):
        now = [artist("A", "reggaeton"), artist("B", "trap latino", "pop"), artist("C", "cuarteto")]
        before = [artist("D", "rock"), artist("E", "reggaeton"), artist("F", "post-punk")]
        families = family_breakdown(now)
        self.assertEqual(families[0]["name"], "Urbano latino")
        self.assertAlmostEqual(sum(row["share"] for row in families), 100, delta=1)
        shift = taste_shift(families, family_breakdown(before))
        self.assertEqual(shift["falling"][0]["name"], "Rock")
        self.assertIn("Cumbia y tropical", [row["name"] for row in shift["rising"]])
        self.assertGreater(shift["distance"], 30)
        self.assertEqual(bridge_artists(now), [{"name": "B", "families": ["Urbano latino", "Pop"], "rank": 2}])
        self.assertEqual(family_combinations(now)[0]["families"], ["Pop", "Urbano latino"])

    def test_track_families_follow_main_artist(self):
        tracks = [
            {"name": "Uno", "artists": [{"id": "A"}]},
            {"name": "Dos", "artists": [{"id": "missing"}]},
        ]
        result = track_family_breakdown(tracks, {"A": ["cumbia"]})
        self.assertEqual(result["coveredTracks"], 1)
        self.assertEqual(result["families"][0]["name"], "Cumbia y tropical")


if __name__ == "__main__":
    unittest.main()
