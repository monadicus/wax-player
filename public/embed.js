// Copyright 2026 MONADIC.US

(function () {
  const API_BASE_URL = "https://api.wax.live";
  const STREAM_BASE_URL = "https://wax.live";
  const FALLBACK_ART =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 320'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23050505'/%3E%3Cstop offset='1' stop-color='%23373737'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='320' rx='36' fill='url(%23g)'/%3E%3Ccircle cx='160' cy='160' r='88' fill='rgba(255,255,255,0.12)'/%3E%3Ccircle cx='160' cy='160' r='22' fill='%23ffffff'/%3E%3C/svg%3E";
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

  function buildProxyUrl(script, endpoint) {
    return (
      new URL("./wax-proxy.php", script.src).toString() +
      "?path=" +
      encodeURIComponent(endpoint)
    );
  }

  function buildLogoUrl(script) {
    return new URL("./waxlive-logo.svg", script.src).toString();
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

  const PLAY_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6.25v11.5l9-5.75-9-5.75Z" fill="currentColor"></path>
    </svg>
  `;

  const PAUSE_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 5.75h3v12.5h-3V5.75Zm6 0h3v12.5h-3V5.75Z" fill="currentColor"></path>
    </svg>
  `;

  const VOLUME_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h4l5-4.5v14l-5-4.5H4v-5Zm11.5-2.11a6 6 0 0 1 0 9.22l-1.36-1.47a4 4 0 0 0 0-6.28l1.36-1.47Zm2.84-2.85a10 10 0 0 1 0 14.92l-1.37-1.46a8 8 0 0 0 0-12l1.37-1.46Z" fill="currentColor"></path>
    </svg>
  `;

  const MUTED_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h4l5-4.5v14l-5-4.5H4v-5Zm10.55 2.5 3.35-3.35 1.4 1.4L15.95 13.4l3.35 3.35-1.4 1.4L14.55 14.8l-3.35 3.35-1.4-1.4 3.35-3.35-3.35-3.35 1.4-1.4L14.55 12Z" fill="currentColor"></path>
    </svg>
  `;

  const SPINNER = '<span class="spinner" aria-hidden="true"></span>';

  function createTemplate(width, height) {
    return `
      <style>
        :host{all:initial;}
        .wax-player-root{display:block;width:${width};max-width:100%;}
        .wax-player-root,.wax-player-root *{box-sizing:border-box;}
        .sr-only{border:0;clip:rect(0 0 0 0);clip-path:inset(50%);height:1px;overflow:hidden;padding:0;position:absolute;white-space:nowrap;width:1px;}
        .player-card{
          -webkit-backdrop-filter:blur(32px) saturate(1.4);
          backdrop-filter:blur(32px) saturate(1.4);
          align-items:start;
          background:linear-gradient(135deg,rgba(18,18,18,.55),rgba(30,30,30,.45));
          border:1px solid rgba(255,255,255,.14);
          border-radius:22px;
          box-shadow:0 24px 48px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.1);
          color:#ffffff;
          display:grid;
          gap:16px;
          grid-template-columns:92px minmax(0,1fr);
          min-height:${height};
          padding:16px;
          transition:box-shadow 300ms ease;
          width:100%;
          font-family:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";
        }
        .player-media{align-content:start;display:grid;gap:12px;}
        .artwork{
          aspect-ratio:1;
          border-radius:16px;
          box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.1);
          display:block;
          height:92px;
          object-fit:cover;
          transition:box-shadow 300ms ease;
          width:92px;
        }
        .waxlive-logo-link{display:block;width:fit-content;}
        .waxlive-logo{display:block;height:auto;opacity:.5;transition:opacity 200ms ease;}
        .player-card:hover .waxlive-logo,.waxlive-logo-link:hover .waxlive-logo{opacity:.7;}
        .waxlive-logo--media{max-width:92px;width:100%;}
        .player-content{display:grid;gap:12px;min-width:0;}
        .player-header{align-items:center;display:flex;gap:12px;justify-content:space-between;}
        .title{font-size:clamp(1.05rem,2vw,1.25rem);font-weight:700;letter-spacing:-.01em;line-height:1.1;margin:0;min-width:0;}
        .title-link{color:inherit;text-decoration:none;transition:opacity 150ms ease;}
        .title-link:hover{opacity:.75;}
        .status-pill{
          flex-shrink:0;
          align-items:center;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
          border-radius:999px;
          color:rgba(255,255,255,.5);
          display:inline-flex;
          font-size:.68rem;
          font-weight:500;
          gap:6px;
          letter-spacing:.02em;
          padding:4px 10px 4px 8px;
          transition:background 200ms ease,border-color 200ms ease,color 200ms ease;
        }
        .status-pill--live{background:rgba(52,211,153,.12);border-color:rgba(52,211,153,.25);color:#6ee7b7;}
        .status-dot{background:currentColor;border-radius:999px;display:none;height:7px;width:7px;}
        .status-pill--live .status-dot{display:block;animation:pulse 1.8s ease-in-out infinite;background:#34d399;}
        .track-panel{min-height:38px;}
        .message-stack{display:grid;gap:3px;}
        .track-title{
          font-size:.92rem;
          font-weight:700;
          letter-spacing:-.005em;
          line-height:1.2;
          margin:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .track-title--wrap{
          display:-webkit-box;
          -webkit-box-orient:vertical;
          -webkit-line-clamp:2;
          white-space:normal;
        }
        .track-meta{
          color:rgba(255,255,255,.5);
          font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
          font-size:.68rem;
          line-height:1.4;
          margin:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .track-meta--hidden{display:none;}
        .player-controls{align-items:center;display:grid;gap:8px;grid-template-columns:auto auto minmax(0,1fr);}
        .play-button,.mute-button{
          align-items:center;
          background:transparent;
          border:2px solid rgba(255,255,255,.45);
          border-radius:999px;
          color:rgba(255,255,255,.45);
          cursor:pointer;
          display:inline-flex;
          height:42px;
          justify-content:center;
          transition:all 150ms cubic-bezier(.4,0,.2,1);
          width:42px;
        }
        .play-button:hover,.mute-button:hover{border-color:rgba(255,255,255,.7);color:rgba(255,255,255,.7);}
        .play-button:active,.mute-button:active{transform:scale(.94);transition-duration:60ms;}
        .play-button:disabled,.mute-button:disabled{
          border-color:rgba(255,255,255,.2);
          color:rgba(255,255,255,.2);
          cursor:not-allowed;
        }
        .play-button:disabled:active,.mute-button:disabled:active{transform:none;}
        .play-button svg{height:26px;margin-left:2px;width:26px;}
        .play-button{border-color:rgba(255,255,255,.55);color:rgba(255,255,255,.55);}
        .play-button:hover{border-color:#ffffff;color:#ffffff;}
        .play-button--playing{animation:play-pulse 2s cubic-bezier(.4,0,.6,1) infinite;border-color:rgba(255,255,255,.8);color:rgba(255,255,255,.8);}
        .mute-button{height:34px;width:34px;}
        .mute-button svg{height:18px;width:18px;}
        .volume-control{align-items:center;display:flex;}
        .volume-input{
          -webkit-appearance:none;
          appearance:none;
          background:transparent;
          cursor:pointer;
          height:24px;
          width:100%;
        }
        .volume-input::-webkit-slider-runnable-track{background:rgba(255,255,255,.1);border-radius:999px;height:4px;}
        .volume-input::-webkit-slider-thumb{
          -webkit-appearance:none;
          appearance:none;
          background:#ffffff;
          border:none;
          border-radius:999px;
          box-shadow:0 1px 4px rgba(0,0,0,.4);
          height:14px;
          margin-top:-5px;
          transition:transform 150ms ease,box-shadow 150ms ease;
          width:14px;
        }
        .volume-input::-webkit-slider-thumb:hover{box-shadow:0 1px 6px rgba(255,255,255,.15),0 1px 4px rgba(0,0,0,.4);transform:scale(1.15);}
        .volume-input::-moz-range-track{background:rgba(255,255,255,.1);border:none;border-radius:999px;height:4px;}
        .volume-input::-moz-range-thumb{background:#ffffff;border:none;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.4);height:14px;width:14px;}
        .volume-input:disabled{cursor:not-allowed;opacity:.3;}
        .volume-input:disabled::-webkit-slider-thumb{box-shadow:none;transform:none;}
        .hint{
          background:rgba(239,68,68,.08);
          border:1px solid rgba(239,68,68,.18);
          border-radius:10px;
          color:#fca5a5;
          display:none;
          font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
          font-size:.72rem;
          line-height:1.4;
          margin:0;
          padding:8px 10px;
        }
        .hint.visible{display:block;}
        .spinner{
          animation:spin .85s linear infinite;
          border:2px solid rgba(255,255,255,.15);
          border-top-color:rgba(255,255,255,.6);
          border-radius:999px;
          display:inline-block;
          height:18px;
          width:18px;
        }
        @keyframes pulse{
          0%,100%{opacity:.4;transform:scale(.85);}
          50%{opacity:1;transform:scale(1);}
        }
        @keyframes play-pulse{
          0%,100%{border-color:rgba(255,255,255,.8);color:rgba(255,255,255,.8);}
          50%{border-color:rgba(255,255,255,.35);color:rgba(255,255,255,.35);}
        }
        @keyframes spin{to{transform:rotate(360deg);}}
        @media (max-width:520px){
          .player-card{gap:14px;grid-template-columns:72px minmax(0,1fr);padding:14px;}
          .artwork{height:72px;width:72px;}
          .waxlive-logo--media{max-width:72px;}
          .player-header{align-items:flex-start;flex-direction:column;gap:10px;}
        }
      </style>
      <div class="wax-player-root">
        <section class="player-card" aria-live="polite">
          <audio preload="none" playsinline></audio>
          <div class="player-media">
            <img class="artwork" alt="Station artwork">
            <a class="waxlive-logo-link" href="https://wax.live" target="_blank" rel="noreferrer" aria-label="Visit wax.live">
              <img class="waxlive-logo waxlive-logo--media" alt="WaxLive">
            </a>
          </div>
          <div class="player-content">
            <div class="player-header">
              <h2 class="title">
                <a class="title-link" href="https://wax.live" target="_blank" rel="noreferrer">Loading station...</a>
              </h2>
              <span class="status-pill">
                <span class="status-dot"></span>
                <span class="status-text">OFF AIR</span>
              </span>
            </div>
            <div class="track-panel">
              <div class="message-stack">
                <p class="track-title">Connecting...</p>
                <p class="track-meta">Checking station status.</p>
              </div>
            </div>
            <div class="player-controls">
              <button class="play-button" type="button" disabled aria-label="Play stream"></button>
              <button class="mute-button" type="button" aria-label="Mute stream"></button>
              <label class="volume-control">
                <span class="sr-only">Volume</span>
                <input class="volume-input" type="range" min="0" max="1" step="0.05" value="0.8" aria-label="Volume">
              </label>
            </div>
            <p class="hint"></p>
          </div>
        </section>
      </div>
    `;
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
  const logoUrl = buildLogoUrl(script);

  const mount = document.createElement("div");
  mount.style.display = "block";
  mount.style.width = "100%";
  mount.style.maxWidth = width;

  const shadow = mount.attachShadow({ mode: "open" });
  shadow.innerHTML = createTemplate(width, height);
  script.insertAdjacentElement("afterend", mount);

  const elements = {
    art: shadow.querySelector(".artwork"),
    logoMedia: shadow.querySelector(".waxlive-logo--media"),
    titleLink: shadow.querySelector(".title-link"),
    status: shadow.querySelector(".status-pill"),
    statusDot: shadow.querySelector(".status-dot"),
    statusText: shadow.querySelector(".status-text"),
    trackTitle: shadow.querySelector(".track-title"),
    meta: shadow.querySelector(".track-meta"),
    play: shadow.querySelector(".play-button"),
    mute: shadow.querySelector(".mute-button"),
    volume: shadow.querySelector(".volume-input"),
    hint: shadow.querySelector(".hint"),
    audio: shadow.querySelector("audio"),
  };

  elements.art.src = FALLBACK_ART;
  elements.logoMedia.src = logoUrl;
  elements.audio.volume = Number(elements.volume.value);
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
    if (state.onAir && state.recognition && state.recognition.cover_art_url) {
      return state.recognition.cover_art_url;
    }
    if (state.station && state.station.cover_art_url) {
      return buildStationArtUrl(state.station.station_name);
    }
    return FALLBACK_ART;
  }

  function setTrack(title, meta, wrap) {
    elements.trackTitle.textContent = title || "";
    elements.trackTitle.className = wrap
      ? "track-title track-title--wrap"
      : "track-title";

    if (meta) {
      elements.meta.textContent = meta;
      elements.meta.className = "track-meta";
    } else {
      elements.meta.textContent = "";
      elements.meta.className = "track-meta track-meta--hidden";
    }
  }

  function isMuted() {
    return elements.audio.muted || Number(elements.volume.value) === 0;
  }

  function render() {
    const hasRecognition =
      state.recognition && state.recognition.song && state.recognition.artist;
    const stationUrl =
      "https://wax.live/" +
      encodeURIComponent(
        state.station ? state.station.station_name : stationName || "",
      );

    elements.titleLink.textContent = getDisplayTitle();
    elements.titleLink.href = stationUrl;
    elements.titleLink.setAttribute("aria-label", titleText);
    elements.statusText.textContent = state.onAir ? "LIVE" : "OFF AIR";
    elements.status.className = state.onAir
      ? "status-pill status-pill--live"
      : "status-pill";
    elements.statusDot.style.display = state.onAir ? "block" : "none";
    elements.art.src = getDisplayArt();

    if (!stationName) {
      setTrack(
        "Station not configured",
        'Add data-station="my-station" to the embed script.',
        false,
      );
    } else if (state.onAir && hasRecognition) {
      setTrack(
        state.recognition.song,
        state.recognition.artist +
          (state.recognition.album ? " • " + state.recognition.album : ""),
        false,
      );
    } else if (state.onAir) {
      setTrack("Listening live", "Waiting for current track recognition.", false);
    } else if (state.station) {
      setTrack(
        state.station.description || "Station is currently off air",
        "",
        true,
      );
    } else {
      setTrack("Loading station...", "Checking station status.", false);
    }

    elements.play.className = state.playing
      ? "play-button play-button--playing"
      : "play-button";
    elements.play.innerHTML = state.busy
      ? SPINNER
      : state.playing
        ? PAUSE_ICON
        : PLAY_ICON;
    elements.play.setAttribute(
      "aria-label",
      state.playing ? "Pause stream" : "Play stream",
    );
    elements.play.disabled = !state.station || !state.onAir || state.busy;
    elements.mute.disabled = !state.station || state.busy;
    elements.mute.innerHTML = isMuted() ? MUTED_ICON : VOLUME_ICON;
    elements.mute.setAttribute(
      "aria-label",
      isMuted() ? "Unmute stream" : "Mute stream",
    );
    elements.volume.disabled = !state.station;
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
      setTrack("Unable to load station", "Check the station name and try again.", false);
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

  elements.volume.addEventListener("input", function () {
    const nextVolume = Number(elements.volume.value);
    elements.audio.volume = nextVolume;
    if (nextVolume > 0 && elements.audio.muted) {
      elements.audio.muted = false;
    }
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
