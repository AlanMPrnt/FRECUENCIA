(function attachHistoryAnalyzer(globalScope) {
  "use strict";

  const MIN_PLAY_MS = 30_000;
  const SESSION_GAP_MS = 30 * 60_000;
  const FORGOTTEN_AFTER_MS = 180 * 86_400_000;
  const DAY_MS = 86_400_000;
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

  // Calendar parts in the listener's time zone ("local", the default in the
  // app) or in UTC. Spotify stores the end of each listen in UTC.
  function makeClock(timeZone) {
    if (timeZone === "local") {
      return (timestamp) => {
        const date = new Date(timestamp);
        return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate(), hour: date.getHours(), weekday: (date.getDay() + 6) % 7 };
      };
    }
    return (timestamp) => {
      const date = new Date(timestamp);
      return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), hour: date.getUTCHours(), weekday: (date.getUTCDay() + 6) % 7 };
    };
  }

  function artistKeyOf(entry) {
    return entry.artist.toLocaleLowerCase("es");
  }

  // Analyses over the whole archive do not depend on the selected range or
  // search, so they are computed once per dataset.
  const datasetCache = new WeakMap();
  function datasetAnalysis(entries) {
    if (datasetCache.has(entries)) return datasetCache.get(entries);
    let archiveEnd = null;
    const firstSeen = new Map();
    const lastSeen = new Map();
    const artistNames = new Map();
    const trackStats = new Map();
    for (const entry of entries) {
      if (entry.playedMs < MIN_PLAY_MS || !Number.isFinite(entry.playedAt)) continue;
      archiveEnd = archiveEnd === null ? entry.playedAt : Math.max(archiveEnd, entry.playedAt);
      const artistKey = artistKeyOf(entry);
      artistNames.set(artistKey, entry.artist);
      if (!firstSeen.has(artistKey) || entry.playedAt < firstSeen.get(artistKey)) firstSeen.set(artistKey, entry.playedAt);
      if (!lastSeen.has(artistKey) || entry.playedAt > lastSeen.get(artistKey)) lastSeen.set(artistKey, entry.playedAt);
      const key = trackKey(entry);
      const stats = trackStats.get(key) || { track: entry.track, artist: entry.artist, uri: entry.uri, plays: 0, firstPlayedAt: entry.playedAt, lastPlayedAt: entry.playedAt };
      stats.plays += 1;
      stats.firstPlayedAt = Math.min(stats.firstPlayedAt, entry.playedAt);
      stats.lastPlayedAt = Math.max(stats.lastPlayedAt, entry.playedAt);
      trackStats.set(key, stats);
    }
    // Favorites with real weight that have been silent for six months.
    const forgotten = archiveEnd === null ? [] : [...trackStats.values()]
      .filter((track) => track.plays >= 8 && track.lastPlayedAt < archiveEnd - FORGOTTEN_AFTER_MS)
      .sort((a, b) => b.plays - a.plays || b.lastPlayedAt - a.lastPlayedAt)
      .slice(0, 12);
    // Artists heard across the longest span who are still in rotation.
    const loyal = archiveEnd === null ? [] : [...firstSeen.entries()]
      .filter(([key]) => lastSeen.get(key) >= archiveEnd - 90 * DAY_MS)
      .map(([key, first]) => ({ artist: artistNames.get(key), firstPlayedAt: first, years: Math.round((archiveEnd - first) / (365.25 * DAY_MS) * 10) / 10 }))
      .filter((artist) => artist.years >= 1)
      .sort((a, b) => a.firstPlayedAt - b.firstPlayedAt)
      .slice(0, 5);
    const result = { archiveEnd, firstSeen, forgotten, loyal };
    datasetCache.set(entries, result);
    return result;
  }

  function aggregateHistory(entries, range = "all", options = {}) {
    const clock = makeClock(options.timeZone || "utc");
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
        const year = clock(entry.playedAt).year;
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
      habits: listeningHabits(selected, eligible, clock),
      story: listeningStory(entries, selected, eligible, clock, cutoff),
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

  function listeningHabits(selected, eligible, clock = makeClock("utc")) {
    const hours = Array(24).fill(0);
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
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
      const parts = clock(entry.playedAt);
      hours[parts.hour]++;
      weekdays[parts.weekday]++;
      heatmap[parts.weekday][parts.hour]++;
      days.add(Date.UTC(parts.year, parts.month, parts.day) / DAY_MS);
    }
    const dayNumbers = [...days].sort((a, b) => a - b);
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
      hours, weekdays, heatmap, activeDays: days.size, longestStreak,
      sessions: listeningSessions(selected),
      effectiveArtists: entropy === null ? null : Math.round(Math.exp(entropy) * 10) / 10,
      topFiveShare: eligible.length ? Math.round(topFive / eligible.length * 100) : null,
      flags,
      platforms: [...platforms].sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }

  // A session ends after 30 minutes without music. Start = end - ms played.
  function listeningSessions(selected) {
    const dated = selected.filter((entry) => Number.isFinite(entry.playedAt) && entry.playedMs > 0)
      .sort((a, b) => a.playedAt - b.playedAt);
    const sessions = [];
    let current = null;
    for (const entry of dated) {
      const start = entry.playedAt - entry.playedMs;
      if (!current || start - current.end > SESSION_GAP_MS) {
        current = { start, end: entry.playedAt, records: 0 };
        sessions.push(current);
      }
      current.end = Math.max(current.end, entry.playedAt);
      current.records += 1;
    }
    if (!sessions.length) return { count: 0, medianMinutes: null, longest: null };
    const minutes = sessions.map((session) => (session.end - session.start) / 60_000).sort((a, b) => a - b);
    const longest = sessions.reduce((best, session) => session.end - session.start > best.end - best.start ? session : best);
    return {
      count: sessions.length,
      medianMinutes: Math.round(minutes[Math.floor((minutes.length - 1) / 2)]),
      longest: { minutes: Math.round((longest.end - longest.start) / 60_000), startedAt: longest.start, records: longest.records }
    };
  }

  // Narrative analyses: eras, a song per year, obsessions, discovery,
  // forgotten favorites and the songs skipped the most.
  function listeningStory(entries, selected, eligible, clock, cutoff) {
    const dataset = datasetAnalysis(entries);
    const months = new Map();
    const yearTracks = new Map();
    const yearArtists = new Map();
    const dayTracks = new Map();
    const names = new Map();
    let discoveredPlays = 0;
    const discoveredArtists = new Set();

    const bump = (map, outer, inner) => {
      const bucket = map.get(outer) || new Map();
      bucket.set(inner, (bucket.get(inner) || 0) + 1);
      map.set(outer, bucket);
    };

    for (const entry of eligible) {
      if (!Number.isFinite(entry.playedAt)) continue;
      const parts = clock(entry.playedAt);
      const artistKey = artistKeyOf(entry);
      const key = trackKey(entry);
      names.set(artistKey, entry.artist);
      names.set(key, { track: entry.track, artist: entry.artist, uri: entry.uri });
      bump(months, parts.year * 12 + parts.month, artistKey);
      bump(yearTracks, parts.year, key);
      bump(yearArtists, parts.year, artistKey);
      bump(dayTracks, Date.UTC(parts.year, parts.month, parts.day), key);
      if (cutoff !== null && dataset.firstSeen.get(artistKey) >= cutoff) {
        discoveredPlays += 1;
        discoveredArtists.add(artistKey);
      }
    }

    const leader = (bucket) => [...bucket.entries()].reduce((best, item) => item[1] > best[1] ? item : best);

    // Eras: consecutive months led by the same artist.
    const eras = [];
    for (const [monthIndex, bucket] of [...months.entries()].sort((a, b) => a[0] - b[0])) {
      const [artistKey, plays] = leader(bucket);
      const total = [...bucket.values()].reduce((sum, value) => sum + value, 0);
      const previous = eras[eras.length - 1];
      if (previous && previous.key === artistKey && previous.endMonth === monthIndex - 1) {
        previous.endMonth = monthIndex;
        previous.months += 1;
        previous.plays += plays;
        previous.monthPlays += total;
      } else {
        eras.push({ key: artistKey, artist: names.get(artistKey), startMonth: monthIndex, endMonth: monthIndex, months: 1, plays, monthPlays: total });
      }
    }
    const monthLabel = (index) => ({ year: Math.floor(index / 12), month: index % 12 });
    const storyEras = eras.filter((era) => era.months >= 2).map((era) => ({
      artist: era.artist, months: era.months, plays: era.plays,
      share: Math.round(era.plays / era.monthPlays * 100),
      start: monthLabel(era.startMonth), end: monthLabel(era.endMonth)
    }));

    const years = [...yearTracks.keys()].sort((a, b) => a - b).map((year) => {
      const [track, trackPlays] = leader(yearTracks.get(year));
      const [artistKey, artistPlays] = leader(yearArtists.get(year));
      let newArtists = 0;
      for (const key of yearArtists.get(year).keys()) {
        const first = dataset.firstSeen.get(key);
        if (Number.isFinite(first) && clock(first).year === year) newArtists += 1;
      }
      return { year, ...names.get(track), trackPlays, topArtist: names.get(artistKey), artistPlays, newArtists };
    });

    let obsession = null;
    for (const [day, bucket] of dayTracks) {
      const [key, plays] = leader(bucket);
      if (!obsession || plays > obsession.plays) obsession = { ...names.get(key), plays, day };
    }

    const skips = new Map();
    for (const entry of selected) {
      if (typeof entry.skipped !== "boolean") continue;
      const key = trackKey(entry);
      const item = skips.get(key) || { track: entry.track, artist: entry.artist, uri: entry.uri, skipped: 0, known: 0 };
      item.known += 1;
      if (entry.skipped) item.skipped += 1;
      skips.set(key, item);
    }
    const mostSkipped = [...skips.values()]
      .filter((item) => item.known >= 5 && item.skipped / item.known >= 0.4)
      .map((item) => ({ ...item, rate: Math.round(item.skipped / item.known * 100) }))
      .sort((a, b) => b.rate - a.rate || b.known - a.known)
      .slice(0, 5);

    return {
      eras: storyEras,
      longestEra: storyEras.reduce((best, era) => !best || era.months > best.months ? era : best, null),
      years,
      obsession,
      discovery: cutoff === null ? null : {
        artists: discoveredArtists.size,
        share: eligible.length ? Math.round(discoveredPlays / eligible.length * 100) : 0
      },
      forgotten: dataset.forgotten,
      loyal: dataset.loyal,
      mostSkipped
    };
  }

  const api = {
    MIN_PLAY_MS,
    aggregateHistory,
    deduplicate,
    listeningSessions,
    normalizeEntry,
    parseHistoryFiles,
    parseHistoryText
  };

  globalScope.FrecuenciaHistory = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
