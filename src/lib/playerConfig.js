// Copyright 2026 MONADIC.US

export function normalizeStationName(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^\/+/, "").toLowerCase();
}

export function parseBooleanParam(value) {
  return value === "1" || value === "true";
}

export function resolvePlayerConfig({ envStationName, search }) {
  const params = new URLSearchParams(search || "");
  const stationOverride = normalizeStationName(params.get("station"));
  const stationName = stationOverride || normalizeStationName(envStationName);

  return {
    stationName,
    autoplay: parseBooleanParam(params.get("autoplay")),
    muted: parseBooleanParam(params.get("muted")),
  };
}

export function getMissingStationMessage() {
  return "Set VITE_STATION_NAME for the deployment, pass ?station= in the player URL, or use data-station on embed.js.";
}
