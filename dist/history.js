(function attachHistoryAnalyzer(globalScope) {
  "use strict";

  const MIN_PLAY_MS = 30_000;
  const RANGE_DAYS = {
    four_weeks: 28,
    six_months: 183,
    one_year: 365
  };

  function clean(value) {
    return String(value ?? "").trim();
  }

  function normalizeTimestamp(value) {
    const raw = clean(value);
    if (!raw) return null;
    const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)
      ? `${raw.replace(" ", "T")}:00Z`
      : raw;
    const timestamp = Date.parse(normalized);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function normalizeEntry(raw) {
    const track = clean(raw.master_metadata_track_name ?? raw.trackName);
    const artist = clean(raw.master_metadata_album_artist_name ?? raw.artistName);
    const album = clean(raw.master_metadata_album_album_name ?? raw.albumName);
    const uri = clean(raw.spotify_track_uri ?? raw.spotifyTrackUri);
    const playedMs = Number(raw.ms_played ?? raw.msPlayed ?? 0);
    const playedAt = normalizeTimestamp(raw.ts ?? raw.endTime);

    if (!track || !artist || !Number.isFinite(playedMs) || playedMs <= 0) return null;
    if (raw.episode_name || raw.episodeName || raw.spotify_episode_uri) return null;

    return {
      track,
      artist,
      album,
      uri,
      playedMs,
      playedAt,
      skipped: raw.skipped === true,
      platform: clean(raw.platform),
      country: clean(raw.conn_country)
    };
  }

  function parseHistoryText(text, fileName = "archivo") {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(`${fileName} no contiene JSON válido.`);
    }
    const rows = Array.isArray(payload) ? payload : payload?.items;
    if (!Array.isArray(rows)) {
      throw new Error(`${fileName} no tiene el formato de historial de Spotify.`);
    }
    return rows.map(normalizeEntry).filter(Boolean);
  }

  async function parseHistoryFiles(files) {
    const parsed = [];
    const rejected = [];
    for (const file of files) {
      try {
        const fileEntries = parseHistoryText(await file.text(), file.name);
        for (const entry of fileEntries) parsed.push(entry);
      } catch (error) {
        rejected.push(error.message);
      }
    }
    if (!parsed.length) {
      throw new Error(rejected[0] || "No encontramos reproducciones de música en esos archivos.");
    }
    return { entries: parsed, rejected };
  }

  function trackKey(entry) {
    if (entry.uri.startsWith("spotify:track:")) return entry.uri;
    return `${entry.artist}\u0000${entry.track}`.toLocaleLowerCase("es");
  }

  function aggregateHistory(entries, range = "all") {
    let latestTimestamp = null;
    for (const entry of entries) {
      if (Number.isFinite(entry.playedAt)) {
        latestTimestamp = latestTimestamp === null
          ? entry.playedAt
          : Math.max(latestTimestamp, entry.playedAt);
      }
    }
    const cutoff = RANGE_DAYS[range] && latestTimestamp
      ? latestTimestamp - RANGE_DAYS[range] * 86_400_000
      : null;
    const eligible = entries.filter((entry) => (
      entry.playedMs >= MIN_PLAY_MS
      && (!cutoff || !entry.playedAt || entry.playedAt >= cutoff)
    ));

    const tracks = new Map();
    const artists = new Map();
    const years = new Map();
    let totalMs = 0;
    let firstPlayedAt = null;
    let lastPlayedAt = null;

    for (const entry of eligible) {
      totalMs += entry.playedMs;
      const key = trackKey(entry);
      const track = tracks.get(key) || {
        track: entry.track,
        artist: entry.artist,
        album: entry.album,
        uri: entry.uri,
        plays: 0,
        playedMs: 0,
        firstPlayedAt: entry.playedAt,
        lastPlayedAt: entry.playedAt
      };
      track.plays += 1;
      track.playedMs += entry.playedMs;
      if (entry.playedAt) {
        firstPlayedAt = firstPlayedAt === null ? entry.playedAt : Math.min(firstPlayedAt, entry.playedAt);
        lastPlayedAt = lastPlayedAt === null ? entry.playedAt : Math.max(lastPlayedAt, entry.playedAt);
        track.firstPlayedAt = track.firstPlayedAt
          ? Math.min(track.firstPlayedAt, entry.playedAt)
          : entry.playedAt;
        track.lastPlayedAt = track.lastPlayedAt
          ? Math.max(track.lastPlayedAt, entry.playedAt)
          : entry.playedAt;
        const year = new Date(entry.playedAt).getUTCFullYear();
        const yearData = years.get(year) || { year, plays: 0, playedMs: 0 };
        yearData.plays += 1;
        yearData.playedMs += entry.playedMs;
        years.set(year, yearData);
      }
      tracks.set(key, track);

      const artistKey = entry.artist.toLocaleLowerCase("es");
      const artist = artists.get(artistKey) || {
        artist: entry.artist,
        plays: 0,
        playedMs: 0
      };
      artist.plays += 1;
      artist.playedMs += entry.playedMs;
      artists.set(artistKey, artist);
    }

    const rankedTracks = [...tracks.values()]
      .sort((a, b) => b.plays - a.plays || b.playedMs - a.playedMs || a.track.localeCompare(b.track))
      .slice(0, 1000)
      .map((track, index) => ({ ...track, rank: index + 1 }));
    const rankedArtists = [...artists.values()]
      .sort((a, b) => b.plays - a.plays || b.playedMs - a.playedMs)
      .slice(0, 100)
      .map((artist, index) => ({ ...artist, rank: index + 1 }));
    const sortedYears = [...years.values()].sort((a, b) => a.year - b.year);

    return {
      range,
      tracks: rankedTracks,
      artists: rankedArtists,
      years: sortedYears,
      summary: {
        plays: eligible.length,
        uniqueTracks: tracks.size,
        uniqueArtists: artists.size,
        playedMs: totalMs,
        firstPlayedAt,
        lastPlayedAt,
        topArtist: rankedArtists[0]?.artist || "—"
      }
    };
  }

  const api = {
    MIN_PLAY_MS,
    aggregateHistory,
    normalizeEntry,
    parseHistoryFiles,
    parseHistoryText
  };

  globalScope.FrecuenciaHistory = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
