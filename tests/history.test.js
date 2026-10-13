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

assert.equal(history.normalizeEntry(null), null);
assert.equal(history.normalizeEntry("bad row"), null);
assert.equal(legacy.skipped, null, "absent is not false");
assert.equal(history.aggregateHistory(entries).summary.playedMs, 779000, "short listens contribute to total time");
const undated = { ...extended, playedAt: null };
assert.equal(history.aggregateHistory([extended, undated], "four_weeks").summary.plays, 1);
assert.equal(history.aggregateHistory([undated], "all").summary.undated, 1);
assert.equal(history.deduplicate([extended, extended, undated, undated]).entries.length, 3);
const zero = history.normalizeEntry({ trackName: "Instant skip", artistName: "A", msPlayed: 0, skipped: true });
const behavior = history.aggregateHistory([zero, { ...extended, skipped: false }]);
assert.deepEqual(behavior.habits.flags.skipped, { yes: 1, known: 2 });
assert.equal(behavior.summary.plays, 1);
assert.equal(behavior.habits.effectiveArtists, 1);
const largeRanking = Array.from({ length: 1100 }, (_, index) => ({ ...extended, uri: `spotify:track:${index}`, track: `Song ${index}` }));
assert.equal(history.aggregateHistory(largeRanking, "all", { query: "Song 1099" }).tracks.length, 1, "search before top-1000 limit");
assert.equal(history.aggregateHistory([extended, { ...legacy, playedMs: 300000 }], "all", { sort: "time" }).tracks[0].track, legacy.track);
assert.equal(history.aggregateHistory([
  { ...extended, playedAt: Date.parse("2025-01-01T23:59Z") },
  { ...extended, playedAt: Date.parse("2025-01-02T00:01Z") },
  { ...extended, playedAt: Date.parse("2025-01-04T12:00Z") }
]).habits.longestStreak, 2);

// Story analytics over a synthetic two-year archive.
const play = (track, artist, iso, extra = {}) => ({
  track, artist, album: "", uri: `spotify:track:${track.replace(/\W/g, "")}`,
  playedMs: 180000, playedAt: Date.parse(iso), skipped: null, shuffle: null, offline: null,
  reasonEnd: "", platform: "", country: "", ...extra
});
const archive = [];
for (let month = 0; month < 3; month++) {
  for (let i = 0; i < 5; i++) archive.push(play("Era Song", "Artista Era", `2024-0${month + 1}-1${i}T20:00:00Z`));
}
for (let i = 0; i < 9; i++) archive.push(play("Vieja Favorita", "Artista Era", `2024-02-0${i + 1}T21:00:00Z`));
for (let i = 0; i < 6; i++) archive.push(play("Obsesión", "Artista Nueva", `2025-06-01T1${i}:00:00Z`, { skipped: i < 4 }));
archive.push(play("Cierre", "Artista Nueva", "2025-06-20T10:00:00Z"));
const story = history.aggregateHistory(archive, "all").story;
assert.equal(story.eras[0].artist, "Artista Era");
assert.equal(story.eras[0].months, 3, "consecutive months merge into one era");
assert.equal(story.obsession.track, "Obsesión");
assert.equal(story.obsession.plays, 6);
assert.deepEqual(story.years.map((year) => year.year), [2024, 2025]);
assert.equal(story.years[1].track, "Obsesión");
assert.equal(story.years[1].newArtists, 1);
assert.deepEqual(story.forgotten.map((track) => track.track), ["Era Song", "Vieja Favorita"], "silent for six months with 8+ plays, most played first");
assert.ok(!story.forgotten.some((track) => track.track === "Obsesión"));
assert.equal(story.mostSkipped[0].rate, 67);
const recent = history.aggregateHistory(archive, "four_weeks").story;
assert.equal(recent.discovery.share, 100, "every play in the window is an artist first heard in it");
const lastYear = history.aggregateHistory(archive, "one_year").story.discovery;
assert.equal(lastYear.artists, 1, "Artista Era predates the year");
assert.equal(lastYear.share, 100);
const allEras = history.aggregateHistory([...archive, play("Era Song", "Artista Era", "2025-06-19T10:00:00Z")], "one_year").story.discovery;
assert.equal(allEras.share, 88, "7 of 8 plays are new artists");

// Sessions: a gap over 30 minutes starts a new session.
const sessions = history.listeningSessions([
  play("A", "X", "2025-01-01T10:03:00Z"), play("B", "X", "2025-01-01T10:06:00Z"),
  play("C", "X", "2025-01-01T12:00:00Z")
]);
assert.equal(sessions.count, 2);
assert.equal(sessions.longest.minutes, 6);

// Local time: the same instant falls on another hour outside UTC.
const lateNight = [play("A", "X", "2025-01-01T02:30:00Z")];
assert.equal(history.aggregateHistory(lateNight, "all", { timeZone: "utc" }).habits.hours[2], 1);
const localHour = new Date(Date.parse("2025-01-01T02:30:00Z")).getHours();
assert.equal(history.aggregateHistory(lateNight, "all", { timeZone: "local" }).habits.hours[localHour], 1);
assert.equal(history.aggregateHistory(lateNight, "all").habits.heatmap.flat().reduce((a, b) => a + b), 1);
console.log("eras, obsessions, discovery, forgotten favorites, sessions and local time: ok");

async function archiveTests() {
  const archive = require("../dist/archive.js");
  const makeZip = require("./zip-fixture.js");
  const rows = [{ ts: "2025-01-10T12:00:00Z", ms_played: 60000, master_metadata_track_name: "Tema", master_metadata_album_artist_name: "Artista" }];
  for (const method of [0, 8]) {
    const bytes = makeZip({
      "MyData/Streaming_History_Audio_2025_0.json": JSON.stringify(rows),
      "MyData/Streaming_History_Audio_2025_1.json": JSON.stringify(rows),
      "MyData/Identity.json": "must never be parsed"
    }, method);
    const result = await history.parseHistoryFiles([new File([bytes], "spotify.zip")]);
    assert.equal(result.entries.length, 1);
    assert.equal(result.duplicates, 1);
    assert.equal(result.rejected.length, 0);
    const damaged = Buffer.from(bytes);
    damaged[30 + Buffer.byteLength("MyData/Streaming_History_Audio_2025_0.json")] ^= 1;
    await assert.rejects(async () => { for await (const item of archive.read(new File([damaged], "broken.zip"))) void item; });
    await assert.rejects(async () => { for await (const item of archive.read(new File([bytes], "oversize.zip"), 2)) void item; }, /grande/);
  }
  const partial = await history.parseHistoryFiles([
    new File([JSON.stringify(rows)], "good.json"), new File(["bad"], "broken.json")
  ]);
  assert.equal(partial.entries.length, 1);
  assert.equal(partial.rejected.length, 1);
  await assert.rejects(() => history.parseHistoryFiles([new File([makeZip({ "Identity.json": "{}" })], "wrong.zip")]), /historial/);
  console.log("ZIP integrity, deduplication, coverage, missing fields, search and habits: ok");
}
archiveTests().catch((error) => { console.error(error); process.exitCode = 1; });
