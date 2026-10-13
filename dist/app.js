const demoData = {
  short_term: {
    label: "Ahora",
    description: "Lo que más te definió durante las últimas 4 semanas.",
    profile: "alt pop × indie",
    genreSampleSize: 20,
    genreSource: "Datos de ejemplo",
    analyzedTracks: 50,
    analyzedArtists: 50,
    era: "2020s",
    averageDuration: "3:36",
    explicitShare: 28,
    genreCount: 14,
    genreInsight: "alt pop aparece en 7 de los 20 artistas usados para esta demostración.",
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
      { title: "7 entradas en el Top 20", copy: "La demostración compara miembros del ranking, no reproducciones.", facts: ["13 artistas se repiten", "7 entran y 7 salen", "Comparación contra 6 meses"] },
      { title: "alt pop encabeza la muestra", copy: "Es el género con más presencia ponderada en este ejemplo.", facts: ["7 de 20 artistas", "14 géneros distintos", "Fuente: datos de demostración"] },
      { title: "La mitad central es reciente", copy: "El rango intercuartílico evita que un lanzamiento extremo distorsione la lectura.", facts: ["Año mediano: 2023", "28% de colaboraciones", "43 artistas acreditados"] }
    ]
  },
  medium_term: {
    label: "Últimos 6 meses",
    description: "La música que sostuvo tu ritmo durante los últimos 6 meses.",
    profile: "indie × alt pop",
    genreSampleSize: 20,
    genreSource: "Datos de ejemplo",
    analyzedTracks: 50,
    analyzedArtists: 50,
    era: "2010s",
    averageDuration: "3:42",
    explicitShare: 22,
    genreCount: 17,
    genreInsight: "indie aparece en 7 de los 20 artistas usados para esta demostración.",
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
      { title: "7 entradas en el Top 20", copy: "La demostración compara miembros del ranking, no reproducciones.", facts: ["13 artistas se repiten", "7 entran y 7 salen", "Comparación contra 1 año"] },
      { title: "indie encabeza la muestra", copy: "Es el género con más presencia ponderada en este ejemplo.", facts: ["7 de 20 artistas", "17 géneros distintos", "Fuente: datos de demostración"] },
      { title: "La mitad central cruza seis años", copy: "El rango intercuartílico resume los años de lanzamiento sin adjetivos subjetivos.", facts: ["Año mediano: 2020", "22% de colaboraciones", "39 artistas acreditados"] }
    ]
  },
  long_term: {
    label: "Último año",
    description: "Los nombres y sonidos que construyeron tu último año.",
    profile: "alternative R&B × indie",
    genreSampleSize: 20,
    genreSource: "Datos de ejemplo",
    analyzedTracks: 50,
    analyzedArtists: 50,
    era: "2010s",
    averageDuration: "3:51",
    explicitShare: 32,
    genreCount: 19,
    genreInsight: "alternative R&B aparece en 7 de los 20 artistas usados para esta demostración.",
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
      { title: "7 entradas en el Top 20", copy: "La demostración compara miembros del ranking, no reproducciones.", facts: ["13 artistas se repiten", "7 entran y 7 salen", "Comparación entre muestras"] },
      { title: "alternative R&B lidera", copy: "Es el género con más presencia ponderada en este ejemplo.", facts: ["7 de 20 artistas", "19 géneros distintos", "Fuente: datos de demostración"] },
      { title: "La muestra cruza décadas", copy: "La amplitud temporal separa el lanzamiento más antiguo del más nuevo.", facts: ["Rango: 1983–2025", "8.1 géneros efectivos", "42 álbumes distintos"] }
    ]
  }
};

const demoEvolution = {
  genreSampleSize: 20,
  genreCoveredArtists: 18,
  genreFamilies: [
    { name: "Indie y alternativo", share: 27, artistCount: 7, examples: ["The Marías", "Phoebe Bridgers"] },
    { name: "Urbano latino", share: 21, artistCount: 5, examples: ["Bad Bunny", "Dillom"] },
    { name: "Pop", share: 18, artistCount: 6, examples: ["Rosalía", "Billie Eilish"] },
    { name: "Rock", share: 14, artistCount: 4, examples: ["Charly García", "Radiohead"] },
    { name: "R&B y soul", share: 11, artistCount: 3, examples: ["Frank Ocean"] },
    { name: "Electrónica", share: 9, artistCount: 2, examples: ["Fred again.."] }
  ],
  trackGenreFamilies: { coveredTracks: 46, sampleSize: 50, families: [
    { name: "Urbano latino", share: 30 }, { name: "Indie y alternativo", share: 22 }, { name: "Pop", share: 20 },
    { name: "Rock", share: 10 }, { name: "R&B y soul", share: 10 }, { name: "Electrónica", share: 8 }
  ] },
  tasteShift: { distance: 24, rising: [{ name: "Urbano latino", delta: 9 }, { name: "Electrónica", delta: 4 }], falling: [{ name: "Rock", delta: -8 }, { name: "Folk y cantautor", delta: -5 }] },
  rankStability: 58,
  trackRankStability: 31,
  bridges: [
    { name: "Rosalía", families: ["Pop", "Urbano latino", "Electrónica"], rank: 2 },
    { name: "Nathy Peluso", families: ["R&B y soul", "Urbano latino"], rank: 7 }
  ]
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const validRanges = ["short_term", "medium_term", "long_term"];
function savedRange() { try { return localStorage.getItem("frecuencia_range"); } catch { return null; } }
let currentRange = validRanges.includes(savedRange())
  ? savedRange()
  : "short_term";
let apiAvailable = false;
let spotifyConfigured = false;
let authenticated = false;
let currentData = null;
let showAllArtists = false;
let showAllTracks = false;
let historyCount = 0;
let historyAnalysis = null;
let historyRequestVersion = 0;
let historyImporting = false;
let dataIsLive = false;
let liveError = false;
let liveRequestId = 0;
let liveController;
let historySort = "plays";
let historyRange = "all";
let historyLimit = 100;
let historyQuery = "";

let historyWorker;
let workerSequence = 0;
const workerRequests = new Map();
function historyTask(action, extra = {}) {
  return new Promise((resolve, reject) => {
    if (!historyWorker) {
      try { historyWorker = new Worker("/history-worker.js"); }
      catch { reject(new Error("Tu navegador no permite analizar el historial. Probá con una versión actual de Chrome, Firefox o Safari.")); return; }
      historyWorker.onmessage = ({ data }) => {
        if (data.progress) { $("#history-status").textContent = data.progress; return; }
        const pending = workerRequests.get(data.id);
        if (!pending) return;
        workerRequests.delete(data.id);
        data.error ? pending.reject(new Error(data.error)) : pending.resolve(data);
      };
      historyWorker.onerror = () => {
        for (const pending of workerRequests.values()) pending.reject(new Error("El análisis se interrumpió. Probá con menos archivos."));
        workerRequests.clear();
        historyWorker.terminate(); historyWorker = null;
      };
    }
    const id = ++workerSequence;
    workerRequests.set(id, { resolve, reject });
    historyWorker.postMessage({ id, action, ...extra });
  });
}

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
  if (value === null || value === undefined) return '<span class="movement new">nuevo</span>';
  if (value > 0) return `<span class="movement up">↗ ${value}</span>`;
  if (value < 0) return `<span class="movement down">↘ ${Math.abs(value)}</span>`;
  return `<span class="movement steady">—</span>`;
}

function normalizedGenres(data) {
  return (Array.isArray(data.genres) ? data.genres : []).map((item, index) => {
    if (!Array.isArray(item)) return item;
    const demoCounts = [7, 6, 5, 4, 3, 3, 2, 2];
    return {
      name: item[0],
      weight: Math.min(100, Math.round((item[1] || 1) / Math.max(data.genres[0]?.[1] || 1, 1) * 100)),
      artistCount: demoCounts[index] || 1,
      artistShare: Math.round((demoCounts[index] || 1) / 20 * 100),
      artists: (data.artists || []).slice(index, index + 3).map((artist) => artist.name)
    };
  }).filter((genre) => genre?.name);
}

function render(data, live = dataIsLive) {
  dataIsLive = live;
  currentData = data;
  $("#period-copy").textContent = data.description;
  $("#period-label").textContent = data.label;
  $("#profile-name").textContent = data.profile;
  $("#metric-track-count").textContent = Number.isFinite(data.analyzedTracks) ? data.analyzedTracks : (data.tracks?.length || "—");
  $("#metric-era").textContent = data.era || "—";
  $("#metric-duration").textContent = data.averageDuration || "—";
  $("#metric-explicit").textContent = Number.isFinite(data.explicitShare) ? data.explicitShare : "—";
  const genres = normalizedGenres(data);
  const topGenre = genres[0] || null;
  $("#primary-genre").textContent = topGenre?.name || "sin datos";
  $("#primary-genre-proof").textContent = topGenre ? `${topGenre.artistCount} de ${data.genreSampleSize || 20} artistas` : "sin etiquetas de relleno";
  $("#genre-source-label").innerHTML = `<i class="dot dot-orange"></i> ${escapeHtml(data.genreSource || "Spotify")}`;
  $("#genre-count").textContent = genres.length ? `${data.genreCount || genres.length} géneros` : "sin datos verificados";
  $("#genre-coverage").textContent = live
    ? `Cobertura: ${data.genreCoveredArtists ?? 0} de ${data.genreSampleSize ?? 0} artistas con género. MusicBrainz se vincula por el ID exacto de Spotify; sólo si falta ese vínculo se usa un nombre sin homónimos.${data.genreLookupComplete === false ? " Todavía estamos completando géneros: probá Actualizar en un minuto." : ""}`
    : "Datos ilustrativos para explorar el diseño. Conectá Spotify para ver la cobertura de tu cuenta.";
  $("#genre-insight").innerHTML = `<span>01</span> ${escapeHtml(data.genreInsight)}`;

  const artists = Array.isArray(data.artists) ? data.artists : [];
  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  const comparison = data.comparison || (live ? { label: "Sin comparación", sampleSize: 0, sharedCount: 0, enteredCount: 0, exitedCount: 0, entered: [] } : {
    label: currentRange === "short_term" ? "Últimos 6 meses" : "Último año",
    sampleSize: 20,
    sharedCount: 13,
    enteredCount: 7,
    exitedCount: 7,
    entered: artists.slice(0, 4).map((artist) => artist.name)
  });
  $("#comparison-title").textContent = `Diferencias del Top ${comparison.sampleSize ?? 20}`;
  $("#comparison-label").textContent = `vs ${comparison.label.toLocaleLowerCase("es")}`;
  $("#comparison-shared").textContent = comparison.sharedCount;
  $("#comparison-entered").textContent = comparison.enteredCount;
  $("#comparison-exited").textContent = comparison.exitedCount;
  $("#comparison-entered-names").textContent = comparison.entered?.length
    ? `${comparison.entered.join(", ")}.`
    : "No hubo entradas nuevas en este Top 20.";
  const science = data.dataScience || (live ? {} : {
    sampleSize: 50,
    effectiveGenreCount: currentRange === "short_term" ? 6.8 : currentRange === "medium_term" ? 7.4 : 8.1,
    medianReleaseYear: currentRange === "short_term" ? 2023 : 2020,
    releaseYearQ1: 2018,
    releaseYearQ3: 2024,
    collaborationCount: currentRange === "short_term" ? 14 : 11,
    collaborationShare: currentRange === "short_term" ? 28 : 22,
    uniqueTrackArtists: currentRange === "short_term" ? 43 : 39,
    uniqueAlbums: currentRange === "short_term" ? 45 : 42,
    mostPresentAlbumName: "Álbum más presente",
    mostPresentAlbumCount: 3,
    oldestReleaseYear: 1983,
    newestReleaseYear: 2025,
    medianReleaseAge: currentRange === "short_term" ? 2 : 5
  });
  $("#science-sample").textContent = `Muestra: Top ${science.sampleSize ?? tracks.length} de afinidad · ${live ? "Spotify" : "Ejemplo"}`;
  $("#science-effective-genres").textContent = Number.isFinite(science.effectiveGenreCount) ? `${science.effectiveGenreCount}` : "—";
  $("#science-median-year").textContent = science.medianReleaseYear || "—";
  $("#science-year-band").textContent = science.releaseYearQ1 && science.releaseYearQ3
    ? `La mitad central va de ${science.releaseYearQ1} a ${science.releaseYearQ3}.`
    : "No hay suficientes fechas para calcularlo.";
  $("#science-collabs").textContent = `${science.collaborationShare || 0}%`;
  $("#science-collabs-copy").textContent = `${science.collaborationCount || 0} de ${science.sampleSize || tracks.length} canciones tienen más de un artista.`;
  $("#science-track-artists").textContent = science.uniqueTrackArtists ?? "—";
  $("#science-albums").textContent = science.uniqueAlbums ?? "—";
  $("#science-album-copy").textContent = science.mostPresentAlbumName
    ? `${science.mostPresentAlbumName}: ${science.mostPresentAlbumCount} canciones del Top.`
    : "No hay álbumes suficientes para calcularlo.";
  $("#science-year-span").textContent = science.oldestReleaseYear && science.newestReleaseYear
    ? `${science.oldestReleaseYear}–${science.newestReleaseYear}`
    : "—";
  $("#science-age-copy").textContent = Number.isFinite(science.medianReleaseAge)
    ? `La canción central tiene ${science.medianReleaseAge} años de antigüedad.`
    : "No hay fechas suficientes para calcularlo.";
  const lead = artists[0] || {
    name: "Sin datos todavía",
    genre: "Escuchá un poco más y volvé",
    movement: 0,
    color: "#313136"
  };
  $("#lead-artist-name").textContent = lead.name;
  $("#lead-artist-initials").textContent = initials(lead.name);
  $("#lead-artist-genre").textContent = lead.genre;
  $("#lead-artist-rank").textContent = lead.movement === null || lead.movement === undefined ? "nuevo" : lead.movement > 0 ? `↗ ${lead.movement}` : lead.movement < 0 ? `↘ ${Math.abs(lead.movement)}` : "—";
  $("#lead-artist-rank").className = `rank-change ${lead.movement < 0 ? "down" : lead.movement == null ? "new" : "up"}`;
  $("#lead-artist-note").textContent = lead.note || (lead.movement == null
    ? `Spotify lo ubica primero en ${data.label.toLocaleLowerCase("es")}; no aparece en el ranking de comparación.`
    : lead.movement > 0
      ? `Subió ${lead.movement} lugares frente a ${comparison.label.toLocaleLowerCase("es")}.`
      : `Spotify lo ubica primero por afinidad en ${data.label.toLocaleLowerCase("es")}.`);
  if (!artists.length) $("#lead-artist-note").textContent = "Spotify no devolvió artistas para este período.";
  const leadImage = lead.image ? safeUrl(lead.image) : null;
  $("#lead-artist-link").classList.toggle("has-image", Boolean(leadImage && leadImage !== "#"));
  $("#lead-artist-initials").hidden = Boolean(leadImage && leadImage !== "#");
  $("#lead-artist-link").style.background = leadImage && leadImage !== "#" ? `linear-gradient(rgba(15,15,18,.12), rgba(15,15,18,.42)), url('${leadImage}') center/cover` : `linear-gradient(145deg, ${lead.color || "#9e73ff"}, #2b184b 52%, #ff7547)`;
  $("#lead-artist-link").href = lead.url ? safeUrl(lead.url) : "#artistas";

  $("#artist-list").innerHTML = artists.length ? artists.slice(0, 50).map((artist, index) => `
    <li class="artist-row ${index >= 10 && !showAllArtists ? "is-hidden" : ""}">
      <a class="artist-row-content" href="${artist.url ? safeUrl(artist.url) : "#artistas"}" ${artist.url ? 'target="_blank" rel="noreferrer"' : ""}>
        <span class="position">${String(index + 1).padStart(2, "0")}</span>
        <span class="artist-avatar" style="--accent:${artist.color || "#a58aff"}">${artist.image ? `<img src="${safeUrl(artist.image)}" alt="" loading="lazy" />` : escapeHtml(initials(artist.name))}</span>
        <span><span class="artist-name">${escapeHtml(artist.name)}</span><span class="artist-genre">${escapeHtml((artist.genres || []).join(" · ") || artist.genre || "Sin género principal")}</span></span>
        ${movementMarkup(artist.movement)}
      </a>
    </li>`).join("") : '<li class="empty-result">Spotify todavía no tiene suficiente historial para este período.</li>';

  $("#genre-cloud").innerHTML = genres.length ? genres.slice(0, 10).map((genre, index) => `
    <span class="genre-chip ${index === 0 ? "primary" : index < 3 ? "secondary" : ""}" style="--size:${.78 + genre.weight / 240}rem;--lift:${(index % 3 - 1) * 4}px">${escapeHtml(genre.name)} <small>${genre.artistCount}</small></span>`).join("") : '<p class="genre-empty">No hay géneros verificados para este período. Nunca los reemplazamos con etiquetas inventadas.</p>';

  $("#genre-breakdown").innerHTML = genres.length ? genres.slice(0, 8).map((genre) => `
    <div class="genre-breakdown-row">
      <div><strong>${escapeHtml(genre.name)}</strong><span>${genre.artistCount} de ${data.genreSampleSize || 20} artistas</span></div>
      <div class="genre-bar" aria-label="${genre.artistShare}% de los artistas"><span style="width:${genre.artistShare}%"></span></div>
      <p>${escapeHtml((genre.artists || []).join(", ") || "Sin artistas asociados")}</p>
    </div>`).join("") : "";

  ["node-a", "node-b", "node-c", "node-d"].forEach((id, index) => {
    const genre = genres[index];
    const node = $(`#${id}`);
    node.hidden = !genre;
    if (genre) {
      node.style.setProperty("--node-scale", String(.82 + genre.weight / 550));
      node.querySelector("span").textContent = genre.name;
    }
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

  renderEvolution(live ? data : { ...demoEvolution, comparison }, live);

  const insightIds = [["discovery-title", "discovery-copy", "discovery-facts"], ["pattern-title", "pattern-copy", "pattern-facts"], ["signature-title", "signature-copy", "signature-facts"]];
  insightIds.forEach(([titleId, copyId, factsId], index) => {
    const rawInsight = data.insights?.[index];
    const insight = Array.isArray(rawInsight)
      ? { title: rawInsight[0], copy: rawInsight[1], facts: ["Detalle disponible al conectar Spotify."] }
      : rawInsight || { title: "Sin datos suficientes", copy: "Spotify todavía no devolvió una muestra analizable.", facts: [] };
    $(`#${titleId}`).textContent = insight.title;
    $(`#${copyId}`).textContent = insight.copy;
    $(`#${factsId}`).innerHTML = (insight.facts || []).map((fact) => `<li>${escapeHtml(fact)}</li>`).join("");
  });
}

function percentOrDash(value) {
  return Number.isFinite(value) ? `${value}%` : "—";
}

function renderEvolution(data, live) {
  const families = Array.isArray(data.genreFamilies) ? data.genreFamilies : [];
  const trackFamilies = data.trackGenreFamilies?.families || [];
  const shift = data.tasteShift;
  const comparisonLabel = (data.comparison?.label || "otro período").toLocaleLowerCase("es");
  $("#evolution-sample").textContent = `vs ${comparisonLabel} · ${live ? "Spotify + MusicBrainz" : "Ejemplo"}`;
  $("#evo-shift").textContent = percentOrDash(shift?.distance);
  $("#evo-shift-copy").textContent = shift
    ? shift.distance < 15 ? "Tu mezcla de familias casi no cambió." : shift.distance < 35 ? "Cambio moderado en el reparto de familias." : "Tu mezcla cambió mucho entre los dos períodos."
    : "Hace falta género en ambos períodos para compararlos.";
  $("#evo-artist-stability").textContent = percentOrDash(data.rankStability);
  $("#evo-track-stability").textContent = percentOrDash(data.trackRankStability);
  $("#evo-coverage").textContent = data.genreSampleSize ? `${data.genreCoveredArtists ?? 0}/${data.genreSampleSize}` : "—";
  const tracksCovered = data.trackGenreFamilies;
  $("#evo-coverage-copy").textContent = tracksCovered?.sampleSize
    ? `Artistas del Top 20 con género. Canciones: ${tracksCovered.coveredTracks} de ${tracksCovered.sampleSize}.`
    : "Artistas del Top 20 con género verificado.";

  const trackShare = new Map(trackFamilies.map((item) => [item.name, item.share]));
  const artistShare = new Map(families.map((item) => [item.name, item.share]));
  const names = [...new Set([...families.map((item) => item.name), ...trackFamilies.map((item) => item.name)])].slice(0, 8);
  const peak = Math.max(1, ...names.map((name) => Math.max(artistShare.get(name) || 0, trackShare.get(name) || 0)));
  $("#family-bars").innerHTML = names.length ? names.map((name) => {
    const artists = artistShare.get(name) || 0;
    const songs = trackShare.get(name) || 0;
    const examples = families.find((item) => item.name === name)?.examples || [];
    return `<div class="family-row">
      <div class="family-name"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(examples.slice(0, 3).join(", ") || "Sólo en canciones")}</span></div>
      <div class="family-meter" role="img" aria-label="${escapeHtml(name)}: ${artists}% en artistas, ${songs}% en canciones">
        <span class="family-bar artists" style="width:${artists / peak * 100}%"></span>
        <span class="family-bar songs" style="width:${songs / peak * 100}%"></span>
      </div>
      <div class="family-values"><span>${artists}%</span><span>${songs}%</span></div>
    </div>`;
  }).join("") : `<p class="history-panel-empty">Sin géneros verificados para este período.</p>`;

  const moves = [
    ...(shift?.rising || []).map((item) => `<li class="up"><strong>${escapeHtml(item.name)}</strong><span>+${item.delta} pts</span></li>`),
    ...(shift?.falling || []).map((item) => `<li class="down"><strong>${escapeHtml(item.name)}</strong><span>${item.delta} pts</span></li>`)
  ];
  $("#family-moves").innerHTML = moves.length ? moves.join("") : `<li class="steady"><strong>Sin movimientos de 3 puntos o más</strong><span>vs ${escapeHtml(comparisonLabel)}</span></li>`;
  const bridges = Array.isArray(data.bridges) ? data.bridges : [];
  $("#bridge-list").innerHTML = bridges.length ? bridges.map((item) => `<li><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.families.join(" · "))}</span></li>`).join("")
    : `<li><span>Ningún artista del Top 20 cruza dos familias.</span></li>`;
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

function playsLabel(count) {
  return `${formatNumber(count)} ${count === 1 ? "escucha" : "escuchas"}`;
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

function formatHistoryDay(timestamp) {
  if (!Number.isFinite(timestamp)) return "—";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(timestamp);
}

function formatHistoryDate(timestamp) {
  if (!Number.isFinite(timestamp)) return "—";
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" }).format(timestamp);
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const localTimeZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "hora local"; } catch { return "hora local"; } })();

function formatMonth(value) {
  return `${MONTHS[value.month]} ${value.year}`;
}

// Story days are calendar days already shifted to local time, stored as UTC midnight.
function formatDay(utcMidnight) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(utcMidnight);
}

function songLink(item) {
  const url = spotifyTrackUrl(item.uri);
  const title = escapeHtml(item.track);
  return url ? `<a href="${url}" target="_blank" rel="noreferrer">${title}</a>` : title;
}

function renderStory(analysis) {
  const story = analysis.story || {};
  const eras = (story.eras || []).slice(-8).reverse();
  $("#story-eras").innerHTML = eras.length ? eras.map((era) => {
    const longest = story.longestEra && era.artist === story.longestEra.artist && era.start.year === story.longestEra.start.year && era.start.month === story.longestEra.start.month;
    return `<li class="${longest ? "longest" : ""}">
      <span class="era-dates">${escapeHtml(formatMonth(era.start))} – ${escapeHtml(formatMonth(era.end))}</span>
      <strong>${escapeHtml(era.artist)}</strong>
      <span class="era-meta">${era.months} meses · ${era.share}% de tus escuchas${longest ? " · tu era más larga" : ""}</span>
    </li>`;
  }).join("") : `<li class="history-panel-empty">Todavía no hay dos meses seguidos con el mismo artista #1.</li>`;

  $("#story-years").innerHTML = (story.years || []).length ? story.years.slice().reverse().map((year) => `
    <tr><td class="story-year">${year.year}</td><td>${songLink(year)}<span>${escapeHtml(year.artist)} · ${playsLabel(year.trackPlays)}</span></td><td>${escapeHtml(year.topArtist)}<span>${playsLabel(year.artistPlays)}</span></td><td>${formatNumber(year.newArtists)}</td></tr>`).join("")
    : `<tr><td colspan="4" class="history-empty">No hay fechas válidas.</td></tr>`;

  const list = (items, render, empty) => items?.length ? items.map(render).join("") : `<li class="history-panel-empty">${empty}</li>`;
  $("#story-forgotten").innerHTML = list(story.forgotten, (item) => `<li><strong>${songLink(item)}</strong><span>${escapeHtml(item.artist)} · ${playsLabel(item.plays)} · última: ${escapeHtml(formatHistoryDate(item.lastPlayedAt))}</span></li>`,
    "Ninguna favorita quedó en silencio por seis meses.");
  $("#story-loyal").innerHTML = list(story.loyal, (item) => `<li><strong>${escapeHtml(item.artist)}</strong><span>desde ${escapeHtml(formatHistoryDate(item.firstPlayedAt))} · ${String(item.years).replace(".", ",")} años</span></li>`,
    "Hace falta más de un año de historial.");
  $("#story-skipped").innerHTML = list(story.mostSkipped, (item) => `<li><strong>${songLink(item)}</strong><span>${escapeHtml(item.artist)} · salteada ${item.rate}% de ${formatNumber(item.known)} veces</span></li>`,
    "Sin canciones salteadas con frecuencia (mínimo 5 registros con dato de salto).");
}

function renderHeatmap(heatmap) {
  const peak = Math.max(1, ...heatmap.flat());
  const header = `<span></span>${Array.from({ length: 24 }, (_, hour) => `<small>${hour % 6 === 0 ? hour : ""}</small>`).join("")}`;
  $("#history-heatmap").innerHTML = header + heatmap.map((row, weekday) => `<span class="heatmap-day">${WEEKDAYS[weekday]}</span>${row.map((plays, hour) =>
    `<i style="--heat:${(plays / peak).toFixed(3)}" title="${WEEKDAYS[weekday]} ${hour}:00 · ${formatNumber(plays)} reproducciones"></i>`).join("")}`).join("");
}

async function renderHistory() {
  if (!historyCount) return;
  const version = ++historyRequestVersion;
  try {
    const result = await historyTask("analyze", { range: historyRange, options: { query: historyQuery, sort: historySort } });
    if (version !== historyRequestVersion) return;
    historyAnalysis = result.analysis;
    renderHistoryAnalysis(result.analysis);
  } catch (error) { showToast(error.message); }
}

function renderHistoryAnalysis(analysis) {
  if (!analysis) return;
  const filteredTracks = analysis.tracks;
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
    <li><span>${String(artist.rank).padStart(2, "0")}</span><strong>${escapeHtml(artist.artist)}</strong><small>${playsLabel(artist.plays)}</small></li>
  `).join("") : '<li class="history-panel-empty">No hay artistas para este período.</li>';

  $("#history-result-count").textContent = `${formatNumber(analysis.matchingTracks)} coincidencias · mostrando ${visibleTracks.length} de hasta 1000`;
  $("#history-coverage").textContent = `Archivo hasta ${formatHistoryDate(analysis.summary.archiveEnd)}. Los períodos terminan en esa fecha, no hoy. ${formatNumber(analysis.summary.shortPlays)} registros de menos de 30 s incluidos en el tiempo, excluidos del ranking.${analysis.summary.undated ? ` ${formatNumber(analysis.summary.undated)} registros sin fecha: sólo en Todo.` : ""}`;
  const habits = analysis.habits;
  const percent = (flag) => flag.known ? `${Math.round(flag.yes / flag.known * 100)}%` : "—";
  const habitCards = [
    ["Días con música", formatNumber(habits.activeDays), "Días con al menos una escucha de 30 s, en tu zona horaria."],
    ["Racha más larga", `${formatNumber(habits.longestStreak)} ${habits.longestStreak === 1 ? "día" : "días"}`, "Días consecutivos con escuchas de al menos 30 s."],
    ["Artistas efectivos", habits.effectiveArtists ?? "—", "Diversidad de escuchas: 5 equivale a cinco artistas escuchados por igual. Entropía de Shannon."],
    ["Tus 5 artistas principales", habits.topFiveShare === null ? "—" : `${habits.topFiveShare}%`, "Parte de las reproducciones de 30 s o más que reúnen entre los cinco."],
    ["Saltos registrados", percent(habits.flags.skipped), `${formatNumber(habits.flags.skipped.yes)} de ${formatNumber(habits.flags.skipped.known)} registros con dato de salto. No implica una canción completa.`],
    ["Modo aleatorio", percent(habits.flags.shuffle), `${formatNumber(habits.flags.shuffle.known)} registros con dato de shuffle. Los campos ausentes no se cuentan como no.`],
    ["Sin conexión", percent(habits.flags.offline), `${formatNumber(habits.flags.offline.known)} registros con dato offline.`],
    ["Sesiones", formatNumber(habits.sessions?.count), habits.sessions?.longest
      ? `Mediana de ${habits.sessions.medianMinutes} min. La más larga: ${formatListeningTime(habits.sessions.longest.minutes * 60_000)}, el ${formatHistoryDay(habits.sessions.longest.startedAt)}.`
      : "Una sesión termina tras 30 minutos sin música."],
    ["Récord en un día", analysis.story?.obsession ? `${analysis.story.obsession.plays}×` : "—", analysis.story?.obsession
      ? `${analysis.story.obsession.track} de ${analysis.story.obsession.artist}, el ${formatDay(analysis.story.obsession.day)}.`
      : "La canción que más repetiste en un mismo día."],
    ["Exploración", analysis.story?.discovery ? `${analysis.story.discovery.share}%` : "—", analysis.story?.discovery
      ? `Escuchas de ${formatNumber(analysis.story.discovery.artists)} artistas que conociste en este período.`
      : "Elegí 1 año, 6 meses o 4 semanas para medir cuánto de lo que escuchás es nuevo."]
  ];
  $("#history-habits").innerHTML = habitCards.map(([label, value, copy]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(copy)}</p></article>`).join("");
  const peak = Math.max(1, ...habits.hours);
  $("#history-hours-caption").textContent = `Reproducciones por hora de finalización · ${localTimeZone}`;
  $("#history-hours").innerHTML = habits.hours.map((plays, hour) => `<div class="hour-column" title="${hour}:00 · ${formatNumber(plays)} reproducciones"><span style="height:${Math.max(2, plays / peak * 100)}%"></span><small>${hour % 3 === 0 ? hour : ""}</small><span class="sr-only">${hour}:00: ${plays} reproducciones</span></div>`).join("");
  if (habits.heatmap) renderHeatmap(habits.heatmap);
  renderStory(analysis);
  $("#history-platforms").textContent = habits.platforms.length ? `Plataformas del archivo: ${habits.platforms.map(([name, ms]) => `${name} (${formatListeningTime(ms)})`).join(" · ")}` : "Este archivo no incluye plataformas.";
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
  if (!files?.length || historyImporting) return;
  historyImporting = true;
  ++historyRequestVersion;
  const uploader = $("#history-upload");
  uploader.classList.add("loading");
  uploader.setAttribute("aria-busy", "true");
  try {
    const result = await historyTask("import", { files: [...files] });
    historyCount = result.count;
    historyAnalysis = result.analysis;
    historyRange = "all";
    historyLimit = 100;
    historyQuery = "";
    $("#history-search").value = "";
    $$(".history-range").forEach((button) => button.classList.toggle("active", button.dataset.historyRange === "all"));
    $("#history-results").hidden = false;
    uploader.classList.add("compact");
    historySort = "plays";
    $("#history-sort").value = "plays";
    renderHistoryAnalysis(result.analysis);
    let persistenceWarning = "";
    try {
      await historyTask($("#history-remember").checked ? "save" : "forget");
    } catch (error) {
      $("#history-remember").checked = false;
      persistenceWarning = " El navegador no permitió actualizar el almacenamiento; una copia anterior podría seguir guardada.";
    }
    const rejectedCopy = result.rejected.length ? ` ${result.rejected.length} archivo(s) no se pudieron leer.` : "";
    $("#history-status").textContent = `${formatNumber(result.count)} registros musicales. ${formatNumber(result.duplicates)} duplicados omitidos.${rejectedCopy} ${$("#history-remember").checked ? "Guardado en este navegador." : "Disponible durante esta visita."}${persistenceWarning}`;
    showToast("Tu historial está listo.");
    $("#history-results").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    $("#history-status").textContent = error.message;
    showToast(error.message || "No pudimos leer esos archivos de Spotify.");
  } finally {
    historyImporting = false;
    uploader.classList.remove("loading");
    uploader.setAttribute("aria-busy", "false");
    $("#history-files").value = "";
  }
}

async function clearHistory() {
  if (historyImporting) return;
  let result;
  try { result = await historyTask("clear"); }
  catch (error) { showToast(error.message); return; }
  ++historyRequestVersion;
  historyCount = 0;
  historyAnalysis = null;
  historyRange = "all";
  historyLimit = 100;
  historyQuery = "";
  $("#history-results").hidden = true;
  $("#history-upload").classList.remove("compact");
  $("#history-ranking").replaceChildren();
  $("#history-search").value = "";
  $("#history-remember").checked = false;
  $("#history-status").textContent = result.warning || "Historial eliminado de esta visita y del almacenamiento local.";
  showToast(result.warning ? "El historial se quitó de esta visita. Revisá el aviso de almacenamiento." : "El historial se eliminó de este navegador.");
}

async function loadLiveData(range, refresh = false) {
  const requestId = ++liveRequestId;
  liveController?.abort();
  liveController = new AbortController();
  const timeout = setTimeout(() => liveController?.abort(), 60_000);
  liveError = false;
  setLoading(true);
  try {
    const query = new URLSearchParams({ range });
    if (refresh) query.set("refresh", "true");
    const response = await fetch(`/api/insights?${query}`, { headers: { Accept: "application/json" }, signal: liveController.signal });
    if (requestId !== liveRequestId) return false;
    if (response.status === 401) {
      setSignedOut();
      render(demoData[currentRange], false);
      showToast("Tu sesión de Spotify venció. Volvé a conectar tu cuenta.");
      return false;
    }
    if (!response.ok) {
      throw new Error(response.status === 429 ? "rate_limit" : "spotify_error");
    }
    const payload = await response.json();
    if (requestId !== liveRequestId) return false;
    render(payload, true);
    $("#data-notice").hidden = true;
    return true;
  } catch (error) {
    if (requestId !== liveRequestId) return false;
    liveError = true;
    $("#data-notice").hidden = false;
    $("#data-notice-copy").textContent = dataIsLive
      ? `No se pudo actualizar. Seguís viendo los últimos datos cargados: ${currentData.label}.`
      : "No pudimos cargar tus estadísticas. Los gráficos visibles son una demostración; podés reintentar o importar tu historial.";
    const shownRange = dataIsLive ? currentData.range : currentRange;
    if (shownRange) {
      currentRange = shownRange;
      $$(".range-button").forEach((button) => button.classList.toggle("active", button.dataset.range === shownRange));
    }
    showToast(error.message === "rate_limit" ? "Spotify está respondiendo lento. Probá de nuevo en un momento." : "No pudimos leer tus estadísticas ahora mismo.");
    return false;
  } finally {
    clearTimeout(timeout);
    if (requestId === liveRequestId) setLoading(false);
  }
}

function setLoading(isLoading) {
  $("#inicio").setAttribute("aria-busy", String(isLoading));
  $$(".range-button").forEach((button) => { button.disabled = isLoading; });
  $("#refresh-button").disabled = isLoading;
  $("#share-button").disabled = isLoading || !dataIsLive;
  $("#refresh-button").classList.toggle("loading", isLoading);
  if (isLoading && authenticated) {
    $("#mode-pill").innerHTML = "<span></span> Leyendo tu música…";
  } else if (authenticated) {
    $("#mode-pill").innerHTML = liveError ? "<span></span> Sin actualizar" : "<span></span> Datos reales";
    if (!dataIsLive) $("#mode-pill").innerHTML = "<span></span> Vista de ejemplo";
  }
}

function setSignedIn(profile) {
  authenticated = true;
  $("#mode-pill").classList.add("live");
  $("#mode-pill").innerHTML = "<span></span> Cargando tu cuenta…";
  $("#connect-button").classList.add("logout");
  $("#connect-button").innerHTML = "Cerrar sesión";
  $("#connect-button").href = "/auth/logout";
  $("#connect-button").dataset.authAction = "logout";
  const profileElement = $("#user-profile");
  const profileName = profile?.displayName || profile?.username || "Spotify";
  $("#user-profile-name").textContent = profileName;
  const avatar = $("#user-profile-avatar");
  avatar.replaceChildren();
  if (profile?.image) {
    const image = document.createElement("img");
    image.src = safeUrl(profile.image);
    image.alt = "";
    avatar.appendChild(image);
  } else {
    avatar.textContent = initials(profileName);
  }
  profileElement.href = profile?.url ? safeUrl(profile.url) : "https://open.spotify.com/";
  profileElement.title = profile?.username ? `Perfil de ${profile.username} en Spotify` : "Perfil de Spotify";
  profileElement.setAttribute("aria-label", `Abrir el perfil de ${profileName} en Spotify`);
  profileElement.hidden = false;
  $("#report-actions").hidden = false;
}

function setSignedOut() {
  authenticated = false;
  dataIsLive = false;
  $("#mode-pill").classList.remove("live");
  $("#mode-pill").innerHTML = "<span></span> Vista de ejemplo";
  $("#connect-button").classList.remove("logout");
  $("#connect-button").innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.62.62 0 0 1-.85.2c-2.34-1.43-5.29-1.75-8.76-.96a.62.62 0 1 1-.28-1.2c3.8-.87 7.08-.5 9.68 1.08.29.18.39.57.2.88Zm1.21-2.7a.78.78 0 0 1-1.07.25c-2.68-1.65-6.77-2.12-9.94-1.16a.78.78 0 1 1-.45-1.49c3.63-1.1 8.14-.57 11.2 1.32.37.22.48.7.26 1.07Zm.1-2.8C14.68 7 9.37 6.63 6.3 7.56a.93.93 0 1 1-.54-1.78c3.53-1.07 9.4-.63 13.1 1.57a.93.93 0 0 1-.96 1.6Z"/></svg>
    Conectar Spotify`;
  $("#connect-button").href = "/auth/login";
  $("#connect-button").dataset.authAction = "login";
  $("#user-profile").hidden = true;
  $("#report-actions").hidden = true;
}

async function shareReport() {
  if (!authenticated || !currentData || !dataIsLive) return;
  const leadArtist = currentData.artists?.[0]?.name || "mi artista favorito";
  const leadGenre = normalizedGenres(currentData)[0]?.name || "sin género verificado";
  const summary = `Mi Frecuencia · ${currentData.label}: mi artista #1 según Spotify es ${leadArtist} y el género con mayor presencia es ${leadGenre}.`;
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
    showToast("Spotify conectado. Estamos cargando tus estadísticas.");
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
      setSignedIn(status.profile);
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
    try { localStorage.setItem("frecuencia_range", currentRange); } catch {}
    if (authenticated) await loadLiveData(currentRange);
    else render(demoData[currentRange], false);
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

$("#connect-button").addEventListener("click", async (event) => {
  if ($("#connect-button").dataset.authAction === "logout") {
    event.preventDefault();
    try {
      const response = await fetch("/auth/logout", { method: "POST", headers: { "X-Frecuencia-Action": "logout" } });
      if (!response.ok) throw new Error("logout");
      location.assign("/?logged_out=1");
    } catch { showToast("No pudimos cerrar la sesión. Volvé a intentar."); }
    return;
  }
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

let searchTimer;
$("#history-search").addEventListener("input", (event) => {
  historyQuery = event.target.value;
  historyLimit = 100;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderHistory, 200);
});

$("#history-more").addEventListener("click", () => {
  historyLimit = Math.min(1000, historyLimit + 100);
  renderHistoryAnalysis(historyAnalysis);
});

$("#history-clear").addEventListener("click", clearHistory);
$("#data-retry").addEventListener("click", () => loadLiveData(currentRange));
$("#history-select").addEventListener("click", () => $("#history-files").click());
$("#history-sort").addEventListener("change", (event) => {
  historySort = event.target.value; historyLimit = 100; renderHistory();
});
$("#history-remember").addEventListener("change", async (event) => {
  const remember = event.target.checked;
  if (!historyCount) return;
  try {
    await historyTask(remember ? "save" : "forget");
    $("#history-status").textContent = remember ? "Guardado sólo en este navegador. Quitar historial borra la copia local." : "La copia guardada se eliminó. El análisis sigue disponible durante esta visita.";
  } catch (error) { event.target.checked = !remember; showToast(error.message); }
});

async function restoreHistory() {
  try {
    const result = await historyTask("restore");
    if (!result.count || historyImporting) return;
    historyCount = result.count; historyAnalysis = result.analysis;
    $("#history-remember").checked = true;
    $("#history-results").hidden = false;
    $("#history-upload").classList.add("compact");
    $("#history-status").textContent = `${formatNumber(result.count)} registros restaurados de este navegador.`;
    renderHistoryAnalysis(result.analysis);
  } catch { /* Private browsing may deny IndexedDB; file imports still work. */ }
}

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

render(demoData[currentRange], false);
handleAuthResult();
detectSession();
restoreHistory();
