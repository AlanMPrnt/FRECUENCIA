const demoData = {
  short_term: {
    label: "Ahora",
    description: "Lo que más te definió durante las últimas 4 semanas.",
    profile: "Nocturno e inquieto",
    diversity: 78,
    change: 23,
    changeNote: "Tu rotación cambió más que el mes pasado. Hay 7 artistas nuevos en tu top.",
    genreCount: 14,
    genreInsight: "El pop alternativo conecta casi la mitad de tus artistas favoritos.",
    genres: [["alt pop", 18], ["indie", 15], ["urbano", 13], ["electrónica", 10], ["neo-psychedelia", 8], ["art pop", 7], ["rap argentino", 6], ["dream pop", 5]],
    artists: [
      { name: "Tame Impala", genre: "neo-psychedelia", movement: 3, color: "#b796ff" },
      { name: "Rosalía", genre: "art pop", movement: 0, color: "#ff8760" },
      { name: "Dillom", genre: "rap argentino", movement: 5, color: "#d9ff43" },
      { name: "Billie Eilish", genre: "alt pop", movement: -2, color: "#72d8ff" },
      { name: "Frank Ocean", genre: "alternative R&B", movement: 1, color: "#ff89c0" }
    ],
    tracks: [
      { name: "Borderline", artist: "Tame Impala", color: "#b796ff" },
      { name: "BIZCOCHITO", artist: "Rosalía", color: "#ff8760" },
      { name: "Cirugía", artist: "Dillom", color: "#d9ff43" },
      { name: "CHIHIRO", artist: "Billie Eilish", color: "#72d8ff" },
      { name: "Pink + White", artist: "Frank Ocean", color: "#ff89c0" }
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
    genreCount: 17,
    genreInsight: "El indie funciona como puente entre tus momentos calmos y enérgicos.",
    genres: [["indie", 20], ["alt pop", 17], ["R&B", 13], ["urbano", 11], ["rock argentino", 9], ["art pop", 8], ["electrónica", 6], ["neo soul", 5]],
    artists: [
      { name: "Rosalía", genre: "art pop", movement: 2, color: "#ff8760" },
      { name: "Frank Ocean", genre: "alternative R&B", movement: 1, color: "#ff89c0" },
      { name: "Tame Impala", genre: "neo-psychedelia", movement: -1, color: "#b796ff" },
      { name: "WOS", genre: "rap argentino", movement: 3, color: "#d9ff43" },
      { name: "The Marías", genre: "indie pop", movement: 0, color: "#72d8ff" }
    ],
    tracks: [
      { name: "SAOKO", artist: "Rosalía", color: "#ff8760" },
      { name: "Nights", artist: "Frank Ocean", color: "#ff89c0" },
      { name: "Let It Happen", artist: "Tame Impala", color: "#b796ff" },
      { name: "MELÓN VINO", artist: "WOS", color: "#d9ff43" },
      { name: "Hush", artist: "The Marías", color: "#72d8ff" }
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
    genreCount: 19,
    genreInsight: "El R&B alternativo es la constante que sobrevive a todos tus cambios.",
    genres: [["alternative R&B", 22], ["indie", 18], ["alt pop", 14], ["rock", 12], ["urbano", 10], ["neo soul", 8], ["dream pop", 6], ["electrónica", 5]],
    artists: [
      { name: "Frank Ocean", genre: "alternative R&B", movement: 0, color: "#ff89c0" },
      { name: "The Strokes", genre: "indie rock", movement: -1, color: "#d9ff43" },
      { name: "Rosalía", genre: "art pop", movement: 4, color: "#ff8760" },
      { name: "Tyler, The Creator", genre: "hip hop", movement: 2, color: "#72d8ff" },
      { name: "Tame Impala", genre: "neo-psychedelia", movement: 1, color: "#b796ff" }
    ],
    tracks: [
      { name: "Self Control", artist: "Frank Ocean", color: "#ff89c0" },
      { name: "The Adults Are Talking", artist: "The Strokes", color: "#d9ff43" },
      { name: "HENTAI", artist: "Rosalía", color: "#ff8760" },
      { name: "See You Again", artist: "Tyler, The Creator", color: "#72d8ff" },
      { name: "Eventually", artist: "Tame Impala", color: "#b796ff" }
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
let currentRange = "short_term";
let apiAvailable = false;
let spotifyConfigured = false;
let authenticated = false;

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
  $("#period-copy").textContent = data.description;
  $("#period-label").textContent = data.label;
  $("#profile-name").textContent = data.profile;
  $("#diversity-score").textContent = data.diversity;
  $("#change-score").textContent = data.change;
  $("#change-note").textContent = data.changeNote;
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

  $("#artist-list").innerHTML = artists.length ? artists.slice(0, 5).map((artist, index) => `
    <li class="artist-row">
      <a class="artist-row-content" href="${artist.url ? safeUrl(artist.url) : "#artistas"}" ${artist.url ? 'target="_blank" rel="noreferrer"' : ""}>
        <span class="position">${String(index + 1).padStart(2, "0")}</span>
        <span class="artist-avatar" style="--accent:${artist.color || "#a58aff"}">${artist.image ? `<img src="${safeUrl(artist.image)}" alt="" />` : escapeHtml(initials(artist.name))}</span>
        <span><span class="artist-name">${escapeHtml(artist.name)}</span><span class="artist-genre">${escapeHtml(artist.genre || "Sin género principal")}</span></span>
        ${movementMarkup(artist.movement ?? 0)}
      </a>
    </li>`).join("") : '<li class="empty-result">Spotify todavía no tiene suficiente historial para este período.</li>';

  $("#genre-cloud").innerHTML = data.genres.slice(0, 10).map(([genre, weight], index) => `
    <span class="genre-chip ${index === 0 ? "primary" : index < 3 ? "secondary" : ""}" style="--size:${.76 + Math.min(weight, 22) / 55}rem;--lift:${(index % 3 - 1) * 4}px">${escapeHtml(genre)}</span>`).join("");

  ["node-a", "node-b", "node-c", "node-d"].forEach((id, index) => {
    const genre = data.genres[index]?.[0] || "descubrimiento";
    $(`#${id} span`).textContent = genre;
  });

  $("#track-list").innerHTML = tracks.length ? tracks.slice(0, 5).map((track, index) => `
    <li class="track-row">
      <a href="${track.url ? safeUrl(track.url) : "#"}" ${track.url ? 'target="_blank" rel="noreferrer"' : ""}>
        <span class="track-cover" style="--accent:${track.color || "#a58aff"}">
          ${track.image ? `<img src="${safeUrl(track.image)}" alt="" />` : escapeHtml(initials(track.name))}
          <span class="track-rank">${String(index + 1).padStart(2, "0")}</span>
        </span>
        <span class="track-meta"><span class="track-name">${escapeHtml(track.name)}</span><span class="track-artist">${escapeHtml(track.artist)}</span></span>
      </a>
    </li>`).join("") : '<li class="empty-result">Todavía no hay canciones suficientes para mostrar.</li>';

  const insightIds = [["discovery-title", "discovery-copy"], ["pattern-title", "pattern-copy"], ["signature-title", "signature-copy"]];
  insightIds.forEach(([titleId, copyId], index) => {
    $(`#${titleId}`).textContent = data.insights[index][0];
    $(`#${copyId}`).textContent = data.insights[index][1];
  });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 3600);
}

async function loadLiveData(range) {
  setLoading(true);
  try {
    const response = await fetch(`/api/insights?range=${encodeURIComponent(range)}`, { headers: { Accept: "application/json" } });
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
  button.addEventListener("click", async () => {
    $$('.range-button').forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    currentRange = button.dataset.range;
    if (authenticated) await loadLiveData(currentRange);
    else render(demoData[currentRange]);
  });
});

$("#connect-button").addEventListener("click", (event) => {
  if ($("#connect-button").dataset.authAction === "logout") return;
  if (!apiAvailable || !spotifyConfigured) {
    event.preventDefault();
    showToast(spotifyConfigured ? "El backend de Spotify no está disponible." : "La conexión con Spotify todavía no está configurada.");
  }
});

render(demoData[currentRange]);
handleAuthResult();
detectSession();
