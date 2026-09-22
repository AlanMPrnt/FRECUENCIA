"use strict";

const assert = require("node:assert/strict");
const history = require("../dist/history.js");

const extended = history.normalizeEntry({
  ts: "2025-01-10T12:00:00Z",
  ms_played: 190000,
  master_metadata_track_name: "Tema Uno",
  master_metadata_album_artist_name: "Artista A",
  master_metadata_album_album_name: "Disco A",
  spotify_track_uri: "spotify:track:abc123"
});
assert.equal(extended.track, "Tema Uno");
assert.equal(extended.playedMs, 190000);

const legacy = history.normalizeEntry({
  endTime: "2024-12-10 12:00",
  msPlayed: 180000,
  trackName: "Tema Dos",
  artistName: "Artista B",
  albumName: "Disco B"
});
assert.equal(legacy.artist, "Artista B");
assert.ok(Number.isFinite(legacy.playedAt));

assert.equal(history.normalizeEntry({
  ts: "2025-01-10T12:00:00Z",
  ms_played: 100000,
  episode_name: "Podcast",
  master_metadata_track_name: "Episodio",
  master_metadata_album_artist_name: "Podcast"
}), null);

const entries = [
  extended,
  { ...extended, playedAt: Date.parse("2025-01-09T12:00:00Z") },
  { ...extended, playedAt: Date.parse("2024-01-01T12:00:00Z") },
  legacy,
  { ...legacy, track: "Salteado", playedMs: 29000, playedAt: Date.parse("2025-01-10T10:00:00Z") }
];

const allTime = history.aggregateHistory(entries, "all");
assert.equal(allTime.summary.plays, 4, "ignora escuchas menores a 30 segundos");
assert.equal(allTime.tracks[0].track, "Tema Uno");
assert.equal(allTime.tracks[0].plays, 3);
assert.equal(allTime.summary.topArtist, "Artista A");

const fourWeeks = history.aggregateHistory(entries, "four_weeks");
assert.equal(fourWeeks.summary.plays, 2);
assert.equal(fourWeeks.tracks[0].plays, 2);
assert.equal(fourWeeks.summary.firstPlayedAt, Date.parse("2025-01-09T12:00:00Z"));

const parsed = history.parseHistoryText(JSON.stringify([
  {
    ts: "2025-01-10T12:00:00Z",
    ms_played: 60000,
    master_metadata_track_name: "Tema",
    master_metadata_album_artist_name: "Artista"
  }
]));
assert.equal(parsed.length, 1);
assert.throws(() => history.parseHistoryText("no-json", "roto.json"), /roto\.json/);

console.log("history analyzer: ok");
