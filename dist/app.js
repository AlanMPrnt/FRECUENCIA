const demoData = {
  short_term: {
    label: "Ahora",
    description: "Lo que más te definió durante las últimas 4 semanas.",
    profile: "Nocturno e inquieto",
    diversity: 78,
    change: 23,
    changeNote: "Tu rotación cambió más que el mes pasado. Hay 7 artistas nuevos en tu top.",
    analyzedTracks: 50,
    analyzedArtists: 50,
    era: "2020s",
    averageDuration: "3:36",
    explicitShare: 28,
    genreCount: 14,
    genreInsight: "El pop alternativo conecta casi la mitad de tus artistas favoritos.",
    genres: [["alt pop", 18], ["indie", 15], ["urbano", 13], ["electrónica", 10], ["neo-psychedelia", 8], ["art pop", 7], ["rap argentino", 6], ["dream pop", 5]],
    artists: [
      { name: "Tame Impala", genre: "neo-psychedelia", movement: 3, color: "#b796ff" },
      { name: "Rosalía", genre: "art pop", movement: 0, color: "#ff8760" },
      { name: "Dillom", genre: "rap argentino", movement: 5, color: "#d9ff43" },
      { name: "Billie Eilish", genre: "alt pop", movement: -2, color: "#72d8ff" },
      { name: "Frank Ocean", genre: "alternative R&B", movement: 1, color: "#ff89c0" },
      { name: "Charly García", genre: "rock argentino", movement: 2, color: "#f5c451" },
      { name: "Nathy Peluso", genre: "latin alternative", movement: -1, color: "#66e3bc" },
      { name: "Radiohead", genre: "art rock", movement: 0, color: "#b796ff" },
      { name: "Bad Bunny", genre: "urbano", movement: 4, color: "#ff8760" },
      { name: "Phoebe Bridgers", genre: "indie folk", movement: -3, color: "#72d8ff" }
    ],
    tracks: [
      { name: "Borderline", artist: "Tame Impala", color: "#b796ff" },
      { name: "BIZCOCHITO", artist: "Rosalía", color: "#ff8760" },
      { name: "Cirugía", artist: "Dillom", color: "#d9ff43" },
      { name: "CHIHIRO", artist: "Billie Eilish", color: "#72d8ff" },
      { name: "Pink + White", artist: "Frank Ocean", color: "#ff89c0" },
      { name: "Yendo de la cama al living", artist: "Charly García", color: "#f5c451" },
      { name: "Buenos Aires", artist: "Nathy Peluso", color: "#66e3bc" },
      { name: "Weird Fishes / Arpeggi", artist: "Radiohead", color: "#b796ff" },
      { name: "MONACO", artist: "Bad Bunny", color: "#ff8760" },
      { name: "Motion Sickness", artist: "Phoebe Bridgers", color: "#72d8ff" }
    ],
    insights: [
      ["Más curioso que de costumbre", "Tres de cada diez artistas entraron a tu radar este mes."],
      ["Tu escucha cruza escenas", "Saltás del indie psicodélico al urbano sin perder el hilo."],
      ["Melancolía bailable", "Tu selección combina introspección, pulso y texturas nocturnas."]
    ]
  },
  medium_term: {
    label: "Últimos 6 meses",
    description: "La música que sostuvo tu ritmo durante los últimos 6 meses.",
    profile: "Ecléctico y emocional",
    diversity: 71,
    change: 16,
    changeNote: "Tu núcleo se mantiene estable, aunque el pop experimental ganó terreno.",
    analyzedTracks: 50,
    analyzedArtists: 50,
    era: "2010s",
    averageDuration: "3:42",
    explicitShare: 22,
    genreCount: 17,
    genreInsight: "El indie funciona como puente entre tus momentos calmos y enérgicos.",
    genres: [["indie", 20], ["alt pop", 17], ["R&B", 13], ["urbano", 11], ["rock argentino", 9], ["art pop", 8], ["electrónica", 6], ["neo soul", 5]],
    artists: [
      { name: "Rosalía", genre: "art pop", movement: 2, color: "#ff8760" },
      { name: "Frank Ocean", genre: "alternative R&B", movement: 1, color: "#ff89c0" },
      { name: "Tame Impala", genre: "neo-psychedelia", movement: -1, color: "#b796ff" },
      { name: "WOS", genre: "rap argentino", movement: 3, color: "#d9ff43" },
      { name: "The Marías", genre: "indie pop", movement: 0, color: "#72d8ff" },
      { name: "Arctic Monkeys", genre: "indie rock", movement: 2, color: "#f5c451" },
      { name: "Tyler, The Creator", genre: "hip hop", movement: -2, color: "#66e3bc" },
      { name: "Soda Stereo", genre: "rock argentino", movement: 1, color: "#b796ff" },
      { name: "Kendrick Lamar", genre: "hip hop", movement: 3, color: "#ff8760" },
      { name: "Fred again..", genre: "electrónica", movement: 4, color: "#72d8ff" }
    ],
    tracks: [
      { name: "SAOKO", artist: "Rosalía", color: "#ff8760" },
      { name: "Nights", artist: "Frank Ocean", color: "#ff89c0" },
      { name: "Let It Happen", artist: "Tame Impala", color: "#b796ff" },
      { name: "MELÓN VINO", artist: "WOS", color: "#d9ff43" },
      { name: "Hush", artist: "The Marías", color: "#72d8ff" },
      { name: "Body Paint", artist: "Arctic Monkeys", color: "#f5c451" },
      { name: "WUSYANAME", artist: "Tyler, The Creator", color: "#66e3bc" },
      { name: "En la ciudad de la furia", artist: "Soda Stereo", color: "#b796ff" },
      { name: "Count Me Out", artist: "Kendrick Lamar", color: "#ff8760" },
      { name: "Delilah (pull me out of this)", artist: "Fred again..", color: "#72d8ff" }
    ],
    insights: [
      ["Exploración con ancla", "Descubrís artistas nuevos sin abandonar tu núcleo de siempre."],
      ["Los discos importan", "Tus canciones favoritas se agrupan en menos álbumes de lo habitual."],
      ["Texturas antes que géneros", "Preferís atmósferas similares aunque cambie la escena musical."]
    ]
  },
  long_term: {
    label: "Último año",
    description: "Los nombres y sonidos que construyeron tu último año.",
    profile: "Intenso y nostálgico",
    diversity: 64,
    change: 31,
    changeNote: "Tu presente se alejó bastante del núcleo que dominaba al comienzo del año.",
    analyzedTracks: 50,
    analyzedArtists: 50,
    era: "2010s",
    averageDuration: "3:51",
    explicitShare: 32,
    genreCount: 19,
    genreInsight: "El R&B alternativo es la constante que sobrevive a todos tus cambios.",
    genres: [["alternative R&B", 22], ["indie", 18], ["alt pop", 14], ["rock", 12], ["urbano", 10], ["neo soul", 8], ["dream pop", 6], ["electrónica", 5]],
    artists: [
      { name: "Frank Ocean", genre: "alternative R&B", movement: 0, color: "#ff89c0" },
      { name: "The Strokes", genre: "indie rock", movement: -1, color: "#d9ff43" },
      { name: "Rosalía", genre: "art pop", movement: 4, color: "#ff8760" },
      { name: "Tyler, The Creator", genre: "hip hop", movement: 2, color: "#72d8ff" },
      { name: "Tame Impala", genre: "neo-psychedelia", movement: 1, color: "#b796ff" },
      { name: "Bad Bunny", genre: "urbano", movement: 2, color: "#f5c451" },
      { name: "Billie Eilish", genre: "alt pop", movement: -2, color: "#66e3bc" },
      { name: "Gustavo Cerati", genre: "rock argentino", movement: 0, color: "#b796ff" },
      { name: "Kendrick Lamar", genre: "hip hop", movement: 3, color: "#ff8760" },
      { name: "Lana Del Rey", genre: "art pop", movement: -1, color: "#72d8ff" }
    ],
    tracks: [
      { name: "Self Control", artist: "Frank Ocean", color: "#ff89c0" },
      { name: "The Adults Are Talking", artist: "The Strokes", color: "#d9ff43" },
      { name: "HENTAI", artist: "Rosalía", color: "#ff8760" },
      { name: "See You Again", artist: "Tyler, The Creator", color: "#72d8ff" },
      { name: "Eventually", artist: "Tame Impala", color: "#b796ff" },
      { name: "Ojitos Lindos", artist: "Bad Bunny", color: "#f5c451" },
      { name: "Happier Than Ever", artist: "Billie Eilish", color: "#66e3bc" },
      { name: "Crimen", artist: "Gustavo Cerati", color: "#b796ff" },
      { name: "Money Trees", artist: "Kendrick Lamar", color: "#ff8760" },
      { name: "West Coast", artist: "Lana Del Rey", color: "#72d8ff" }
    ],
    insights: [
      ["Un año de retornos", "Tus favoritos históricos reaparecen entre cada nueva obsesión."],
      ["La voz manda", "Las voces expresivas dominan incluso cuando cambia el género."],
      ["Nostalgia en movimiento", "Volvés a canciones conocidas, pero las mezclás con hallazgos recientes."]
    ]
  }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const validRanges = ["short_term", "medium_term", "long_term"];
let currentRange = validRanges.includes(localStorage.getItem("frecuencia_range"))
  ? localStorage.getItem("frecuencia_range")
  : "short_term";
let apiAvailable = false;
let spotifyConfigured = false;
let authenticated = false;
let currentData = null;
let showAllArtists = false;
let showAllTracks = false;
let historyEntries = [];
let historyRange = "all";
let historyLimit = 100;
let historyQuery = "";

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function safeUrl(value) {
  try {
    const url = new URL(value, location.origin);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function movementMarkup(value) {
  if (value > 0) return `<span class="movement up">↗ ${value}</span>`;
  if (value < 0) return `<span class="movement down">↘ ${Math.abs(value)}</span>`;
  return `<span class="movement steady">—</span>`;
}

function render(data) {
  currentData = data;
  $("#period-copy").textContent = data.description;
  $("#period-label").textContent = data.label;
  $("#profile-name").textContent = data.profile;
  $("#diversity-score").textContent = data.diversity;
  $("#change-score").textContent = data.change;
  $("#change-note").textContent = data.changeNote;
  $("#metric-track-count").textContent = Number.isFinite(data.analyzedTracks) ? data.analyzedTracks : (data.tracks?.length || "—");
  $("#metric-era").textContent = data.era || "—";
  $("#metric-duration").textContent = data.averageDuration || "—";
  $("#metric-explicit").textContent = Number.isFinite(data.explicitShare) ? data.explicitShare : "—";
  $("#genre-count").textContent = `${data.genreCount} géneros`;
  $("#genre-insight").innerHTML = `<span>01</span> ${escapeHtml(data.genreInsight)}`;

  const artists = Array.isArray(data.artists) ? data.artists : [];
  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  const lead = artists[0] || {
    name: "Sin datos todavía",
    genre: "Escuchá un poco más y volvé",
    movement: 0,
    color: "#313136"
  };
  $("#lead-artist-name").textContent = lead.name;
  $("#lead-artist-initials").textContent = initials(lead.name);
  $("#lead-artist-genre").textContent = lead.genre;
  $("#lead-artist-rank").textContent = lead.movement > 0 ? `↗ ${lead.movement}` : lead.movement < 0 ? `↘ ${Math.abs(lead.movement)}` : "—";
  $("#lead-artist-rank").className = `rank-change ${lead.movement < 0 ? "down" : "up"}`;
  $("#lead-artist-note").textContent = lead.note || (lead.movement > 0 ? `Subió ${lead.movement} lugares en este período.` : "Se mantiene firme en tu núcleo musical.");
  const leadImage = lead.image ? safeUrl(lead.image) : null;
  $("#lead-artist-link").style.background = leadImage && leadImage !== "#" ? `linear-gradient(rgba(15,15,18,.12), rgba(15,15,18,.42)), url('${leadImage}') center/cover` : `linear-gradient(145deg, ${lead.color || "#9e73ff"}, #2b184b 52%, #ff7547)`;
  $("#lead-artist-link").href = lead.url ? safeUrl(lead.url) : "#artistas";

  $("#artist-list").innerHTML = artists.length ? artists.slice(0, 50).map((artist, index) => `
    <li class="artist-row ${index >= 10 && !showAllArtists ? "is-hidden" : ""}">
      <a class="artist-row-content" href="${artist.url ? safeUrl(artist.url) : "#artistas"}" ${artist.url ? 'target="_blank" rel="noreferrer"' : ""}>
        <span class="position">${String(index + 1).padStart(2, "0")}</span>
        <span class="artist-avatar" style="--accent:${artist.color || "#a58aff"}">${artist.image ? `<img src="${safeUrl(artist.image)}" alt="" loading="lazy" />` : escapeHtml(initials(artist.name))}</span>
        <span><span class="artist-name">${escapeHtml(artist.name)}</span><span class="artist-genre">${escapeHtml((artist.genres || []).join(" · ") || artist.genre || "Sin género principal")}</span></span>
        ${movementMarkup(artist.movement ?? 0)}
      </a>
    </li>`).join("") : '<li class="empty-result">Spotify todavía no tiene suficiente historial para este período.</li>';

  $("#genre-cloud").innerHTML = data.genres.slice(0, 10).map(([genre, weight], index) => `
    <span class="genre-chip ${index === 0 ? "primary" : index < 3 ? "secondary" : ""}" style="--size:${.76 + Math.min(weight, 22) / 55}rem;--lift:${(index % 3 - 1) * 4}px">${escapeHtml(genre)}</span>`).join("");

  ["node-a", "node-b", "node-c", "node-d"].forEach((id, index) => {
    const genre = data.genres[index]?.[0] || "descubrimiento";
    $(`#${id} span`).textContent = genre;
  });

  $("#track-list").innerHTML = tracks.length ? tracks.slice(0, 50).map((track, index) => `
    <li class="track-row ${index >= 10 && !showAllTracks ? "is-hidden" : ""}">
      <a href="${track.url ? safeUrl(track.url) : "#"}" ${track.url ? 'target="_blank" rel="noreferrer"' : ""}>
        <span class="track-cover" style="--accent:${track.color || "#a58aff"}">
          ${track.image ? `<img src="${safeUrl(track.image)}" alt="" loading="lazy" />` : escapeHtml(initials(track.name))}
          <span class="track-rank">${String(index + 1).padStart(2, "0")}</span>
        </span>
        <span class="track-meta">
          <span class="track-name">${escapeHtml(track.name)}</span>
          <span class="track-artist">${escapeHtml(track.artist)}</span>
          ${(track.album || track.duration) ? `<span class="track-details">${escapeHtml([track.album, track.releaseYear, track.duration, track.explicit ? "E" : ""].filter(Boolean).join(" · "))}</span>` : ""}
        </span>
      </a>
    </li>`).join("") : '<li class="empty-result">Todavía no hay canciones suficientes para mostrar.</li>';

  updateListToggle($("#artist-toggle"), showAllArtists, artists.length);
  updateListToggle($("#track-toggle"), showAllTracks, tracks.length);

  const insightIds = [["discovery-title", "discovery-copy"], ["pattern-title", "pattern-copy"], ["signature-title", "signature-copy"]];
  insightIds.forEach(([titleId, copyId], index) => {
    $(`#${titleId}`).textContent = data.insights[index][0];
    $(`#${copyId}`).textContent = data.insights[index][1];
  });
}

function updateListToggle(button, expanded, count) {
  button.hidden = count <= 10;
  button.setAttribute("aria-expanded", String(expanded));
  button.textContent = expanded ? "Ver Top 10" : `Ver Top ${Math.min(count, 50)}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 3600);
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-AR").format(value || 0);
}

function formatListeningTime(milliseconds) {
  const minutes = Math.floor((milliseconds || 0) / 60_000);
  const hours = Math.floor(minutes / 60);
  if (minutes < 1) return "<1 min";
  if (hours < 1) return `${minutes} min`;
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${formatNumber(days)} d ${remainingHours} h`;
}

function spotifyTrackUrl(uri) {
  const match = /^spotify:track:([A-Za-z0-9]+)$/.exec(uri || "");
  return match ? `https://open.spotify.com/track/${match[1]}` : "";
}

function formatHistoryDate(timestamp) {
  if (!Number.isFinite(timestamp)) return "—";
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp);
}

function renderHistory() {
  if (!historyEntries.length || !window.FrecuenciaHistory) return;
  const analysis = window.FrecuenciaHistory.aggregateHistory(historyEntries, historyRange);
  const normalizedQuery = historyQuery.trim().toLocaleLowerCase("es");
  const filteredTracks = normalizedQuery
    ? analysis.tracks.filter((item) => `${item.track} ${item.artist} ${item.album}`.toLocaleLowerCase("es").includes(normalizedQuery))
    : analysis.tracks;
  const visibleTracks = filteredTracks.slice(0, historyLimit);

  $("#history-play-count").textContent = formatNumber(analysis.summary.plays);
  $("#history-unique-tracks").textContent = formatNumber(analysis.summary.uniqueTracks);
  $("#history-unique-artists").textContent = formatNumber(analysis.summary.uniqueArtists);
  $("#history-listening-time").textContent = formatListeningTime(analysis.summary.playedMs);
  $("#history-top-artist").textContent = analysis.summary.topArtist;
  $("#history-date-range").textContent = analysis.summary.firstPlayedAt === analysis.summary.lastPlayedAt
    ? formatHistoryDate(analysis.summary.firstPlayedAt)
    : `${formatHistoryDate(analysis.summary.firstPlayedAt)} – ${formatHistoryDate(analysis.summary.lastPlayedAt)}`;

  const highestYearMs = Math.max(1, ...analysis.years.map((year) => year.playedMs));
  $("#history-years").innerHTML = analysis.years.length ? analysis.years.map((year) => {
    const height = Math.max(7, Math.round(year.playedMs / highestYearMs * 100));
    const time = formatListeningTime(year.playedMs);
    return `<div class="history-year" aria-label="${year.year}: ${escapeHtml(time)}"><strong>${escapeHtml(time)}</strong><span style="--bar-height:${height}%"></span><small>${year.year}</small></div>`;
  }).join("") : '<p class="history-panel-empty">No hay fechas válidas en este período.</p>';
  $("#history-artists").innerHTML = analysis.artists.length ? analysis.artists.slice(0, 10).map((artist) => `
    <li><span>${String(artist.rank).padStart(2, "0")}</span><strong>${escapeHtml(artist.artist)}</strong><small>${formatNumber(artist.plays)} escuchas</small></li>
  `).join("") : '<li class="history-panel-empty">No hay artistas para este período.</li>';

  $("#history-result-count").textContent = `${formatNumber(filteredTracks.length)} ${filteredTracks.length === 1 ? "canción" : "canciones"} en el ranking`;
  $("#history-ranking").innerHTML = visibleTracks.length ? visibleTracks.map((item) => {
    const url = spotifyTrackUrl(item.uri);
    const title = escapeHtml(item.track);
    return `
      <tr>
        <td class="history-rank">${String(item.rank).padStart(3, "0")}</td>
        <td class="history-song">${url ? `<a href="${url}" target="_blank" rel="noreferrer">${title}<span aria-hidden="true">↗</span></a>` : title}</td>
        <td><strong>${escapeHtml(item.artist)}</strong><span>${escapeHtml(item.album || "Álbum sin identificar")}</span></td>
        <td class="history-plays"><strong>${formatNumber(item.plays)}</strong><span>escuchas</span></td>
        <td>${formatListeningTime(item.playedMs)}</td>
      </tr>`;
  }).join("") : '<tr><td class="history-empty" colspan="5">No encontramos canciones para esa búsqueda o período.</td></tr>';
  $("#history-more").hidden = visibleTracks.length >= filteredTracks.length;
}

async function importHistoryFiles(files) {
  if (!files?.length || !window.FrecuenciaHistory) return;
  const uploader = $("#history-upload");
  uploader.classList.add("loading");
  uploader.setAttribute("aria-busy", "true");
  try {
    const result = await window.FrecuenciaHistory.parseHistoryFiles([...files]);
    historyEntries = result.entries;
    historyRange = "all";
    historyLimit = 100;
    historyQuery = "";
    $("#history-search").value = "";
    $$(".history-range").forEach((button) => button.classList.toggle("active", button.dataset.historyRange === "all"));
    $("#history-results").hidden = false;
    uploader.classList.add("compact");
    renderHistory();
    const rejectedCopy = result.rejected.length ? ` ${result.rejected.length} archivo(s) no se pudieron leer.` : "";
    showToast(`${formatNumber(result.entries.length)} registros procesados en tu dispositivo.${rejectedCopy}`);
    $("#history-results").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showToast(error.message || "No pudimos leer esos archivos de Spotify.");
  } finally {
    uploader.classList.remove("loading");
    uploader.setAttribute("aria-busy", "false");
    $("#history-files").value = "";
  }
}

function clearHistory() {
  historyEntries = [];
  historyRange = "all";
  historyLimit = 100;
  historyQuery = "";
  $("#history-results").hidden = true;
  $("#history-upload").classList.remove("compact");
  $("#history-ranking").replaceChildren();
  $("#history-search").value = "";
  showToast("El historial se quitó de esta sesión.");
}

async function loadLiveData(range, refresh = false) {
  setLoading(true);
  try {
    const query = new URLSearchParams({ range });
    if (refresh) query.set("refresh", "true");
    const response = await fetch(`/api/insights?${query}`, { headers: { Accept: "application/json" } });
    if (response.status === 401) {
      setSignedOut();
      showToast("Tu sesión de Spotify venció. Volvé a conectar tu cuenta.");
      return false;
    }
    if (!response.ok) {
      throw new Error(response.status === 429 ? "rate_limit" : "spotify_error");
    }
    const payload = await response.json();
    render(payload);
    return true;
  } catch (error) {
    showToast(error.message === "rate_limit" ? "Spotify está respondiendo lento. Probá de nuevo en un momento." : "No pudimos leer tus estadísticas ahora mismo.");
    return false;
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  $("#inicio").setAttribute("aria-busy", String(isLoading));
  $$(".range-button").forEach((button) => { button.disabled = isLoading; });
  $("#refresh-button").disabled = isLoading;
  $("#share-button").disabled = isLoading;
  $("#refresh-button").classList.toggle("loading", isLoading);
  if (isLoading && authenticated) {
    $("#mode-pill").innerHTML = "<span></span> Leyendo tu música…";
  } else if (authenticated) {
    $("#mode-pill").innerHTML = "<span></span> Datos reales";
  }
}

function setSignedIn() {
  authenticated = true;
  $("#mode-pill").classList.add("live");
  $("#mode-pill").innerHTML = "<span></span> Datos reales";
  $("#connect-button").classList.add("logout");
  $("#connect-button").innerHTML = "Cerrar sesión";
  $("#connect-button").href = "/auth/logout";
  $("#connect-button").dataset.authAction = "logout";
  $("#report-actions").hidden = false;
}

function setSignedOut() {
  authenticated = false;
  $("#mode-pill").classList.remove("live");
  $("#mode-pill").innerHTML = "<span></span> Vista de ejemplo";
  $("#connect-button").classList.remove("logout");
  $("#connect-button").innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.62.62 0 0 1-.85.2c-2.34-1.43-5.29-1.75-8.76-.96a.62.62 0 1 1-.28-1.2c3.8-.87 7.08-.5 9.68 1.08.29.18.39.57.2.88Zm1.21-2.7a.78.78 0 0 1-1.07.25c-2.68-1.65-6.77-2.12-9.94-1.16a.78.78 0 1 1-.45-1.49c3.63-1.1 8.14-.57 11.2 1.32.37.22.48.7.26 1.07Zm.1-2.8C14.68 7 9.37 6.63 6.3 7.56a.93.93 0 1 1-.54-1.78c3.53-1.07 9.4-.63 13.1 1.57a.93.93 0 0 1-.96 1.6Z"/></svg>
    Conectar Spotify`;
  $("#connect-button").href = "/auth/login";
  $("#connect-button").dataset.authAction = "login";
  $("#report-actions").hidden = true;
}

async function shareReport() {
  if (!authenticated || !currentData) return;
  const leadArtist = currentData.artists?.[0]?.name || "mi artista favorito";
  const leadGenre = currentData.genres?.[0]?.[0] || "una mezcla única";
  const summary = `Mi Frecuencia · ${currentData.label}: ${currentData.profile}. Mi artista #1 es ${leadArtist}, mi género principal es ${leadGenre} y mi variedad musical es ${currentData.diversity}/100.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Mi Frecuencia", text: summary, url: location.origin });
    } else {
      await navigator.clipboard.writeText(`${summary} ${location.origin}`);
      showToast("Tu resumen quedó copiado para compartir.");
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast("No pudimos compartir el resumen.");
  }
}

function handleAuthResult() {
  const params = new URLSearchParams(location.search);
  if (params.get("connected") === "1") {
    showToast("Spotify conectado. Ya estás viendo tus datos reales.");
  } else if (params.get("logged_out") === "1") {
    showToast("Sesión cerrada.");
  } else if (params.has("auth_error")) {
    const messages = {
      access_denied: "Cancelaste la conexión con Spotify.",
      invalid_state: "La autorización venció. Intentá conectarte de nuevo.",
      missing_code: "Spotify no completó la autorización.",
      token_exchange: "No pudimos completar el login con Spotify."
    };
    showToast(messages[params.get("auth_error")] || "No pudimos conectar Spotify.");
  }
  if (["connected", "logged_out", "auth_error"].some((key) => params.has(key))) {
    history.replaceState({}, "", location.pathname + location.hash);
  }
}

async function detectSession() {
  try {
    const response = await fetch("/api/auth/status", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("No API");
    const status = await response.json();
    apiAvailable = true;
    spotifyConfigured = status.configured;
    if (status.authenticated) {
      setSignedIn();
      await loadLiveData(currentRange);
    } else {
      setSignedOut();
    }
  } catch {
    setSignedOut();
  }
}

$$('.range-button').forEach((button) => {
  button.classList.toggle("active", button.dataset.range === currentRange);
  button.addEventListener("click", async () => {
    $$('.range-button').forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    currentRange = button.dataset.range;
    localStorage.setItem("frecuencia_range", currentRange);
    if (authenticated) await loadLiveData(currentRange);
    else render(demoData[currentRange]);
  });
});

$("#artist-toggle").addEventListener("click", () => {
  showAllArtists = !showAllArtists;
  render(currentData);
});

$("#track-toggle").addEventListener("click", () => {
  showAllTracks = !showAllTracks;
  render(currentData);
});

$("#refresh-button").addEventListener("click", async () => {
  const updated = await loadLiveData(currentRange, true);
  if (updated) showToast("Tus datos se actualizaron con Spotify.");
});

$("#share-button").addEventListener("click", shareReport);

$("#connect-button").addEventListener("click", (event) => {
  if ($("#connect-button").dataset.authAction === "logout") return;
  if (!apiAvailable || !spotifyConfigured) {
    event.preventDefault();
    showToast(spotifyConfigured ? "El backend de Spotify no está disponible." : "La conexión con Spotify todavía no está configurada.");
  }
});

$("#history-files").addEventListener("change", (event) => importHistoryFiles(event.target.files));

$$('.history-range').forEach((button) => {
  button.addEventListener("click", () => {
    $$('.history-range').forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    historyRange = button.dataset.historyRange;
    historyLimit = 100;
    renderHistory();
  });
});

$("#history-search").addEventListener("input", (event) => {
  historyQuery = event.target.value;
  historyLimit = 100;
  renderHistory();
});

$("#history-more").addEventListener("click", () => {
  historyLimit = Math.min(1000, historyLimit + 100);
  renderHistory();
});

$("#history-clear").addEventListener("click", clearHistory);

const historyUpload = $("#history-upload");
["dragenter", "dragover"].forEach((eventName) => historyUpload.addEventListener(eventName, (event) => {
  event.preventDefault();
  historyUpload.classList.add("is-dragging");
}));
["dragleave", "drop"].forEach((eventName) => historyUpload.addEventListener(eventName, (event) => {
  event.preventDefault();
  historyUpload.classList.remove("is-dragging");
}));
historyUpload.addEventListener("drop", (event) => importHistoryFiles(event.dataTransfer.files));

render(demoData[currentRange]);
handleAuthResult();
detectSession();
