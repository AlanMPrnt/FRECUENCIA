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
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const track = clean(raw.master_metadata_track_name ?? raw.trackName);
    const artist = clean(raw.master_metadata_album_artist_name ?? raw.artistName);
    const album = clean(raw.master_metadata_album_album_name ?? raw.albumName);
    const uri = clean(raw.spotify_track_uri ?? raw.spotifyTrackUri);
    const playedMs = Number(raw.ms_played ?? raw.msPlayed ?? 0);
    const playedAt = normalizeTimestamp(raw.ts ?? raw.endTime);

    if (!track || !artist || !Number.isFinite(playedMs) || playedMs < 0 || playedMs > 86_400_000) return null;
    if (raw.episode_name || raw.episodeName || raw.spotify_episode_uri) return null;

    return {
      track,
      artist,
      album,
      uri,
      playedMs,
      playedAt,
      skipped: typeof raw.skipped === "boolean" ? raw.skipped : null,
      shuffle: typeof raw.shuffle === "boolean" ? raw.shuffle : null,
      offline: typeof raw.offline === "boolean" ? raw.offline : null,
      reasonEnd: clean(raw.reason_end),
      platform: clean(raw.platform),
      country: clean(raw.conn_country)
    };
  }

  function parseHistoryText(text, fileName = "archivo") {
    let payload;
    try {
      payload = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch (error) {
      throw new Error(`${fileName} no contiene JSON válido.`);
    }
    const rows = Array.isArray(payload) ? payload : payload?.items;
    if (!Array.isArray(rows)) {
      throw new Error(`${fileName} no tiene el formato de historial de Spotify.`);
    }
    return rows.map(normalizeEntry).filter(Boolean);
  }

  async function parseHistoryFiles(files, onProgress = () => {}) {
    const parsed = [];
    const rejected = [];
    let totalBytes = 0;
    const maxBytes = 256 * 1024 * 1024;
    for (const file of files) {
      try {
        onProgress(`Leyendo ${file.name}…`);
        if (!/\.(json|zip)$/i.test(file.name)) throw new Error(`${file.name}: elegí un ZIP o JSON de Spotify.`);
        if (file.size > maxBytes) throw new Error(`${file.name}: supera 256 MB. Importá sus JSON por separado.`);
        if (/\.zip$/i.test(file.name)) {
          if (!globalScope.FrecuenciaArchive) throw new Error("El lector ZIP no está disponible. Podés importar los JSON.");
          for await (const item of globalScope.FrecuenciaArchive.read(file, maxBytes - totalBytes)) {
            totalBytes += item.size;
            onProgress(`Analizando ${item.name}…`);
            try {
              for (const entry of parseHistoryText(item.text, item.name)) parsed.push(entry);
            } catch (error) { rejected.push(error.message); }
          }
        } else {
          totalBytes += file.size || 0;
          if (totalBytes > maxBytes) throw new Error("Esta importación supera 256 MB descomprimidos. Elegí menos archivos.");
          for (const entry of parseHistoryText(await file.text(), file.name)) parsed.push(entry);
        }
      } catch (error) {
        rejected.push(error.message);
      }
    }
    if (!parsed.length) {
      throw new Error(rejected[0] || "No encontramos reproducciones de música en esos archivos.");
    }
    const unique = deduplicate(parsed);
    return { entries: unique.entries, duplicates: unique.duplicates, rejected };
  }

  function deduplicate(entries) {
    const seen = new Set();
    let duplicates = 0;
    const unique = [];
    for (const entry of entries) {
      // Legacy timestamps have minute precision: keep duration in the key.
      // Undated events cannot safely be identified as the same listen.
      const key = Number.isFinite(entry.playedAt)
        ? JSON.stringify([entry.playedAt, trackKey(entry), entry.playedMs]) : null;
      if (key && seen.has(key)) { duplicates += 1; continue; }
      if (key) seen.add(key);
      unique.push(entry);
    }
    return { entries: unique, duplicates };
  }

  function trackKey(entry) {
    if (entry.uri?.startsWith("spotify:track:")) return entry.uri;
    return `${entry.artist}\u0000${entry.track}`.toLocaleLowerCase("es");
  }

  function aggregateHistory(entries, range = "all", options = {}) {
    let latestTimestamp = null;
    for (const entry of entries) {
      if (Number.isFinite(entry.playedAt)) {
        latestTimestamp = latestTimestamp === null
          ? entry.playedAt
          : Math.max(latestTimestamp, entry.playedAt);
      }
    }
    const cutoff = RANGE_DAYS[range] && latestTimestamp !== null
      ? latestTimestamp - RANGE_DAYS[range] * 86_400_000
      : null;
    const selected = entries.filter((entry) => !RANGE_DAYS[range] ||
      (cutoff !== null && Number.isFinite(entry.playedAt) && entry.playedAt >= cutoff));
    const eligible = selected.filter((entry) => entry.playedMs >= MIN_PLAY_MS);

    const tracks = new Map();
    const artists = new Map();
    const years = new Map();
    let totalMs = 0;
    let firstPlayedAt = null;
    let lastPlayedAt = null;

    for (const entry of selected) {
      totalMs += entry.playedMs;
      if (Number.isFinite(entry.playedAt)) {
        firstPlayedAt = firstPlayedAt === null ? entry.playedAt : Math.min(firstPlayedAt, entry.playedAt);
        lastPlayedAt = lastPlayedAt === null ? entry.playedAt : Math.max(lastPlayedAt, entry.playedAt);
        const year = new Date(entry.playedAt).getUTCFullYear();
        const yearData = years.get(year) || { year, plays: 0, playedMs: 0 };
        yearData.plays += entry.playedMs >= MIN_PLAY_MS ? 1 : 0;
        yearData.playedMs += entry.playedMs;
        years.set(year, yearData);
      }
      if (entry.playedMs < MIN_PLAY_MS) continue;
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

    const byTime = options.sort === "time";
    const query = clean(options.query).toLocaleLowerCase("es");
    const orderedTracks = [...tracks.values()]
      .sort((a, b) => (byTime ? b.playedMs - a.playedMs : b.plays - a.plays) || b.playedMs - a.playedMs || a.track.localeCompare(b.track))
      .map((track, index) => ({ ...track, rank: index + 1 }));
    const matches = query ? orderedTracks.filter((item) =>
      `${item.track} ${item.artist} ${item.album}`.toLocaleLowerCase("es").includes(query)) : orderedTracks;
    const rankedTracks = matches.slice(0, 1000);
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
      matchingTracks: matches.length,
      habits: listeningHabits(selected, eligible),
      summary: {
        records: selected.length,
        shortPlays: selected.length - eligible.length,
        undated: selected.filter((entry) => !Number.isFinite(entry.playedAt)).length,
        archiveEnd: latestTimestamp,
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

  function listeningHabits(selected, eligible) {
    const hours = Array(24).fill(0);
    const weekdays = Array(7).fill(0);
    const days = new Set();
    const platforms = new Map();
    const counts = new Map();
    const flags = { skipped: { yes: 0, known: 0 }, shuffle: { yes: 0, known: 0 }, offline: { yes: 0, known: 0 } };
    for (const entry of selected) {
      for (const [flag, value] of Object.entries(flags)) {
        if (typeof entry[flag] === "boolean") { value.known++; if (entry[flag]) value.yes++; }
      }
      if (entry.platform && entry.playedMs > 0) platforms.set(entry.platform, (platforms.get(entry.platform) || 0) + entry.playedMs);
    }
    for (const entry of eligible) {
      const artistKey = entry.artist.toLocaleLowerCase("es");
      counts.set(artistKey, (counts.get(artistKey) || 0) + 1);
      if (!Number.isFinite(entry.playedAt)) continue;
      const date = new Date(entry.playedAt);
      hours[date.getUTCHours()]++;
      weekdays[(date.getUTCDay() + 6) % 7]++;
      days.add(date.toISOString().slice(0, 10));
    }
    const dayNumbers = [...days].map((day) => Date.parse(`${day}T00:00:00Z`) / 86_400_000).sort((a, b) => a - b);
    let streak = 0, longestStreak = 0, previous = null;
    for (const day of dayNumbers) {
      streak = previous !== null && day === previous + 1 ? streak + 1 : 1;
      longestStreak = Math.max(longestStreak, streak);
      previous = day;
    }
    const frequencies = [...counts.values()];
    const entropy = eligible.length ? -frequencies.reduce((sum, count) => {
      const p = count / eligible.length;
      return sum + p * Math.log(p);
    }, 0) : null;
    const topFive = frequencies.sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0);
    return {
      hours, weekdays, activeDays: days.size, longestStreak,
      effectiveArtists: entropy === null ? null : Math.round(Math.exp(entropy) * 10) / 10,
      topFiveShare: eligible.length ? Math.round(topFive / eligible.length * 100) : null,
      flags,
      platforms: [...platforms].sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }

  const api = {
    MIN_PLAY_MS,
    aggregateHistory,
    deduplicate,
    normalizeEntry,
    parseHistoryFiles,
    parseHistoryText
  };

  globalScope.FrecuenciaHistory = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
