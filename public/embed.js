(function () {
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

  function applyWidth(iframe, value) {
    const width = (value || "420").trim();
    if (/^\d+$/.test(width)) {
      iframe.width = width;
      iframe.style.width = "min(" + width + "px, 100%)";
      return;
    }
    if (/^\d+px$/.test(width)) {
      iframe.width = width.slice(0, -2);
      iframe.style.width = "min(" + width + ", 100%)";
      return;
    }
    iframe.style.width = width;
  }

  function applyHeight(iframe, value) {
    const height = (value || "160").trim();
    if (/^\d+$/.test(height)) {
      iframe.height = height;
      iframe.style.height = height + "px";
      return;
    }
    if (/^\d+px$/.test(height)) {
      iframe.height = height.slice(0, -2);
      iframe.style.height = height;
      return;
    }
    iframe.style.height = height;
  }

  const script = document.currentScript;
  if (!script || script.dataset.waxPlayerMounted === "1") {
    return;
  }

  script.dataset.waxPlayerMounted = "1";

  const playerUrl = new URL("./", script.src);
  const stationName = normalizeStationName(script.dataset.station || "");
  if (stationName) {
    playerUrl.searchParams.set("station", stationName);
  }
  if (parseBoolean(script.dataset.autoplay)) {
    playerUrl.searchParams.set("autoplay", "1");
  }
  if (parseBoolean(script.dataset.muted)) {
    playerUrl.searchParams.set("muted", "1");
  }

  const iframe = document.createElement("iframe");
  iframe.src = playerUrl.toString();
  iframe.title = script.dataset.title || "WaxLive player";
  iframe.loading = "lazy";
  iframe.allow = "autoplay";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.setAttribute("scrolling", "no");
  iframe.style.background = "transparent";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.maxWidth = "100%";
  iframe.style.overflow = "hidden";

  applyWidth(iframe, script.dataset.width);
  applyHeight(iframe, script.dataset.height);

  script.insertAdjacentElement("afterend", iframe);
})();
