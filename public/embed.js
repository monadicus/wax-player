(function () {
  const API_BASE_URL = "https://api.wax.live";
  const STREAM_BASE_URL = "https://wax.live";
  const FALLBACK_ART =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 320'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2318181b'/%3E%3Cstop offset='1' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='320' rx='36' fill='url(%23g)'/%3E%3Ccircle cx='160' cy='160' r='88' fill='rgba(255,255,255,0.12)'/%3E%3Ccircle cx='160' cy='160' r='22' fill='%23fff7ed'/%3E%3C/svg%3E";
  const POLL_INTERVAL_MS = 15000;

  function normalizeStationName(value) {
    if (typeof value !== "string") return "";
    return value.trim().replace(/^\/+/, "").toLowerCase();
  }

  function parseBoolean(value) {
    if (typeof value !== "string") return false;
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "1" ||
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "on"
    );
  }

  function toDimension(value, fallback) {
    const source = (value || fallback || "").trim();
    if (!source) return fallback;
    if (/^\d+$/.test(source)) return source + "px";
    return source;
  }

  function formatUpdatedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function buildProxyUrl(script, endpoint) {
    return (
      new URL("./wax-proxy.php", script.src).toString() +
      "?path=" +
      encodeURIComponent(endpoint)
    );
  }

  async function requestJson(script, endpoint) {
    let response;

    try {
      response = await fetch(buildProxyUrl(script, endpoint), {
        credentials: "same-origin",
      });
      if (response.status === 404 || response.status === 405) {
        throw new Error("proxy-unavailable");
      }
    } catch {
      response = await fetch(API_BASE_URL + endpoint);
    }

    const payload = await response
      .json()
      .catch(() => ({ message: "Invalid API response." }));

    if (!response.ok) {
      const error = new Error(
        (payload && payload.message) || "Request failed: " + response.status,
      );
      error.status = response.status;
      throw error;
    }

    return payload && payload.data ? payload.data : null;
  }

  function buildStationArtUrl(stationName) {
    return API_BASE_URL + "/art/station/" + encodeURIComponent(stationName);
  }

  function buildStreamUrl(mountpoint) {
    return STREAM_BASE_URL + "/stream/" + encodeURIComponent(mountpoint);
  }

  function createTemplate(width, height) {
    return (
      '<style>' +
      ':host{all:initial;}' +
      '.wax-player-root{display:block;width:' +
      width +
      ';max-width:100%;min-height:' +
      height +
      ';}' +
      '.wax-player{box-sizing:border-box;display:grid;grid-template-columns:72px minmax(0,1fr);gap:14px;width:100%;min-height:' +
      height +
      ';padding:14px;border-radius:24px;border:1px solid rgba(254,215,170,.18);background:linear-gradient(135deg,rgba(23,23,23,.96),rgba(41,37,36,.92)),linear-gradient(180deg,rgba(249,115,22,.14),transparent 55%);box-shadow:0 18px 32px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(18px);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fef2e8;}' +
      '.wax-player *{box-sizing:border-box;}' +
      '.art{width:72px;height:72px;border-radius:18px;object-fit:cover;display:block;box-shadow:0 10px 24px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.12);background:#1c1917;}' +
      '.content{display:grid;gap:12px;min-width:0;}' +
      '.header{display:flex;justify-content:space-between;align-items:start;gap:10px;}' +
      '.eyebrow,.meta,.link,.status,.button,.hint{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;}' +
      '.eyebrow{margin:0 0 6px;color:#fdba74;font-size:10px;letter-spacing:.12em;text-transform:uppercase;}' +
      '.title{margin:0;font-size:20px;line-height:1.05;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.status{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,237,213,.12);background:rgba(255,247,237,.08);color:rgba(255,237,213,.76);font-size:11px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}' +
      '.status.live{background:rgba(249,115,22,.16);border-color:rgba(251,146,60,.24);color:#fff7ed;}' +
      '.dot{display:block;width:8px;height:8px;border-radius:999px;background:currentColor;}' +
      '.status.live .dot{animation:waxPulse 1.6s ease-in-out infinite;}' +
      '.track{display:grid;gap:4px;min-height:40px;}' +
      '.track-title{margin:0;font-size:16px;line-height:1.15;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.meta{margin:0;color:rgba(255,237,213,.72);font-size:11px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.controls{display:flex;align-items:center;gap:10px;}' +
      '.button{appearance:none;border:1px solid rgba(255,237,213,.14);border-radius:16px;background:rgba(255,247,237,.08);color:#fff7ed;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 14px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;transition:transform .12s ease,background .12s ease,border-color .12s ease;}' +
      '.button:hover{transform:translateY(-1px);background:rgba(255,247,237,.14);border-color:rgba(255,237,213,.24);}' +
      '.button:disabled{cursor:not-allowed;opacity:.45;transform:none;}' +
      '.button.primary{background:linear-gradient(135deg,rgba(251,146,60,.94),rgba(249,115,22,.86));color:#1c1917;border-color:rgba(255,237,213,.2);}' +
      '.button.primary:hover{background:linear-gradient(135deg,rgba(253,186,116,.98),rgba(249,115,22,.92));}' +
      '.link{color:rgba(255,237,213,.84);font-size:11px;text-decoration:none;}' +
      '.link:hover{color:#fff7ed;}' +
      '.hint{color:#fecaca;background:rgba(127,29,29,.26);border:1px solid rgba(248,113,113,.18);border-radius:12px;padding:8px 10px;font-size:11px;line-height:1.4;display:none;}' +
      '.hint.visible{display:block;}' +
      '@keyframes waxPulse{0%,100%{opacity:.45;transform:scale(.9);}50%{opacity:1;transform:scale(1);}}' +
      '@media (max-width:520px){.wax-player-root{width:100%;}.wax-player{grid-template-columns:64px minmax(0,1fr);padding:12px;gap:12px;}.art{width:64px;height:64px;border-radius:16px;}.header{flex-direction:column;align-items:stretch;}.title{font-size:18px;}.track-title{font-size:15px;}}' +
      "</style>" +
      '<div class="wax-player-root">' +
      '<section class="wax-player" aria-live="polite">' +
      '<img class="art" alt="Station artwork">' +
      '<div class="content">' +
      '<div class="header">' +
      '<div><p class="eyebrow">WaxLive embed</p><h2 class="title">Loading station...</h2></div>' +
      '<div class="status"><span class="dot"></span><span class="status-text">Loading</span></div>' +
      "</div>" +
      '<div class="track"><p class="track-title">Connecting...</p><p class="meta">Checking station status.</p></div>' +
      '<div class="controls">' +
      '<button class="button primary play" type="button" disabled>Play</button>' +
      '<button class="button mute" type="button">Mute</button>' +
      '<a class="link" target="_blank" rel="noreferrer">Open station</a>' +
      "</div>" +
      '<p class="hint"></p>' +
      '<audio preload="none" playsinline></audio>' +
      "</div>" +
      "</section>" +
      "</div>"
    );
  }

  const script = document.currentScript;
  if (!script || script.dataset.waxPlayerMounted === "1") return;
  script.dataset.waxPlayerMounted = "1";

  const stationName = normalizeStationName(script.dataset.station || "");
  const width = toDimension(script.dataset.width, "420px");
  const height = toDimension(script.dataset.height, "160px");
  const autoplay = parseBoolean(script.dataset.autoplay);
  const defaultMuted = parseBoolean(script.dataset.muted);
  const titleText = script.dataset.title || "WaxLive player";

  const mount = document.createElement("div");
  mount.style.display = "block";
  mount.style.width = "100%";
  mount.style.maxWidth = width;

  const shadow = mount.attachShadow({ mode: "open" });
  shadow.innerHTML = createTemplate(width, height);
  script.insertAdjacentElement("afterend", mount);

  const elements = {
    art: shadow.querySelector(".art"),
    title: shadow.querySelector(".title"),
    status: shadow.querySelector(".status"),
    statusText: shadow.querySelector(".status-text"),
    trackTitle: shadow.querySelector(".track-title"),
    meta: shadow.querySelector(".meta"),
    play: shadow.querySelector(".play"),
    mute: shadow.querySelector(".mute"),
    link: shadow.querySelector(".link"),
    hint: shadow.querySelector(".hint"),
    audio: shadow.querySelector("audio"),
  };

  elements.link.textContent = "Open station";
  elements.link.setAttribute("aria-label", titleText);
  elements.art.src = FALLBACK_ART;
  elements.audio.muted = defaultMuted;

  const state = {
    station: null,
    recognition: null,
    onAir: false,
    playing: false,
    busy: false,
    pollTimer: null,
    destroyed: false,
    autoplayAttempted: false,
  };

  function setHint(message) {
    elements.hint.textContent = message || "";
    elements.hint.className = message ? "hint visible" : "hint";
  }

  function mapRecognition(recognition) {
    if (!recognition) return null;
    return {
      artist: recognition.artist || "",
      album: recognition.album || null,
      song: recognition.song || "",
      cover_art_url: recognition.cover_art_url || null,
      created_at: recognition.created_at || null,
    };
  }

  function getDisplayTitle() {
    if (state.station && state.station.title && state.station.title.trim()) {
      return state.station.title.trim();
    }
    return state.station ? state.station.station_name : stationName || "WaxLive player";
  }

  function getDisplayArt() {
    if (state.recognition && state.recognition.cover_art_url) {
      return state.recognition.cover_art_url;
    }
    if (state.station && state.station.cover_art_url) {
      return buildStationArtUrl(state.station.station_name);
    }
    return FALLBACK_ART;
  }

  function render() {
    const hasRecognition =
      state.recognition && state.recognition.song && state.recognition.artist;

    elements.title.textContent = getDisplayTitle();
    elements.statusText.textContent = state.onAir ? "On air" : "Off air";
    elements.status.className = state.onAir ? "status live" : "status";
    elements.art.src = getDisplayArt();
    elements.link.href =
      "https://wax.live/" +
      encodeURIComponent(
        state.station ? state.station.station_name : stationName || "",
      );

    if (!stationName) {
      elements.trackTitle.textContent = "Station not configured";
      elements.meta.textContent = "Add data-station=\"my-station\" to the embed script.";
    } else if (hasRecognition) {
      const updatedAt = formatUpdatedAt(state.recognition.created_at);
      elements.trackTitle.textContent = state.recognition.song;
      elements.meta.textContent =
        state.recognition.artist +
        (state.recognition.album ? " • " + state.recognition.album : "") +
        (updatedAt ? " • " + updatedAt : "");
    } else if (state.onAir) {
      elements.trackTitle.textContent = "Live now";
      elements.meta.textContent = "Waiting for current track recognition.";
    } else if (state.station) {
      elements.trackTitle.textContent = "Station is currently off air";
      elements.meta.textContent = "Playback will become available automatically when live.";
    } else {
      elements.trackTitle.textContent = "Loading station...";
      elements.meta.textContent = "Checking station status.";
    }

    if (state.busy) {
      elements.play.textContent = "Loading";
    } else if (state.playing) {
      elements.play.textContent = "Pause";
    } else {
      elements.play.textContent = "Play";
    }

    elements.play.disabled = !state.station || !state.onAir || state.busy;
    elements.mute.disabled = !state.station;
    elements.mute.textContent = elements.audio.muted ? "Unmute" : "Mute";
  }

  async function loadRecognition() {
    if (!stationName) return;
    try {
      const recognition = await requestJson(
        script,
        "/recognitions/station/" + encodeURIComponent(stationName),
      );
      state.recognition = mapRecognition(recognition);
      render();
    } catch (error) {
      if (error && error.status === 404) {
        state.recognition = null;
        render();
        return;
      }
      setHint("Could not load current track.");
    }
  }

  async function refreshStationStatus() {
    if (!state.station) return;
    try {
      const status = await requestJson(
        script,
        "/stream-status/" + encodeURIComponent(state.station.mountpoint),
      );
      const nextOnAir = Boolean(status && status.on_air === true);
      if (state.onAir !== nextOnAir) {
        state.onAir = nextOnAir;
        if (!nextOnAir) {
          state.recognition = null;
          elements.audio.pause();
        }
      }
      if (state.onAir) {
        await loadRecognition();
      } else {
        render();
      }
    } catch {
      setHint("Could not refresh station status.");
    }
  }

  function startPolling() {
    if (state.pollTimer) {
      window.clearInterval(state.pollTimer);
    }
    state.pollTimer = window.setInterval(function () {
      refreshStationStatus();
    }, POLL_INTERVAL_MS);
  }

  async function loadStation() {
    if (!stationName) {
      render();
      return;
    }

    try {
      const station = await requestJson(
        script,
        "/station/" + encodeURIComponent(stationName),
      );
      state.station = station;
      state.onAir = station.is_live === true;
      elements.audio.src = buildStreamUrl(station.mountpoint);
      render();

      if (state.onAir) {
        await loadRecognition();
      }
      startPolling();

      if (autoplay && state.onAir && !state.autoplayAttempted) {
        state.autoplayAttempted = true;
        await togglePlayback();
      }
    } catch (error) {
      setHint(
        error && error.status === 404
          ? "Station not found."
          : "Could not load station data.",
      );
      elements.trackTitle.textContent = "Unable to load station";
      elements.meta.textContent = "Check the station name and try again.";
    }
  }

  async function togglePlayback() {
    if (!state.station || !state.onAir) return;

    setHint("");

    if (!elements.audio.paused) {
      elements.audio.pause();
      return;
    }

    state.busy = true;
    render();

    try {
      await elements.audio.play();
    } catch {
      setHint("Playback was blocked. Press play again to start the stream.");
    } finally {
      state.busy = false;
      render();
    }
  }

  elements.play.addEventListener("click", function () {
    togglePlayback();
  });

  elements.mute.addEventListener("click", function () {
    elements.audio.muted = !elements.audio.muted;
    render();
  });

  elements.audio.addEventListener("play", function () {
    state.playing = true;
    render();
  });

  elements.audio.addEventListener("pause", function () {
    state.playing = false;
    render();
  });

  elements.audio.addEventListener("waiting", function () {
    state.busy = true;
    render();
  });

  elements.audio.addEventListener("canplay", function () {
    state.busy = false;
    render();
  });

  elements.audio.addEventListener("error", function () {
    state.playing = false;
    state.busy = false;
    setHint("The stream could not be loaded right now.");
    render();
  });

  window.addEventListener(
    "beforeunload",
    function () {
      state.destroyed = true;
      if (state.pollTimer) {
        window.clearInterval(state.pollTimer);
      }
    },
    { once: true },
  );

  render();
  loadStation();
})();
