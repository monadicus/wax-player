export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.wax.live";
export const STREAM_BASE_URL =
  import.meta.env.VITE_STREAM_URL || "https://wax.live";
export const API_WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

async function request(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  const payload = await response
    .json()
    .catch(() => ({ message: "Invalid API response." }));

  if (!response.ok) {
    const error = new Error(payload?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload?.data ?? null;
}

export function buildStationArtworkUrl(stationName) {
  return `${API_BASE_URL}/art/station/${encodeURIComponent(stationName)}`;
}

export function buildStreamUrl(mountpoint) {
  return `${STREAM_BASE_URL}/stream/${encodeURIComponent(mountpoint)}`;
}

export function openStationSocket(mountpoint) {
  return new WebSocket(
    `${API_WS_BASE_URL}/ws/public/${encodeURIComponent(mountpoint)}`,
  );
}

export function mapLatestSongMessage(message) {
  return {
    id:
      message.recognition_id === null || message.recognition_id === undefined
        ? null
        : Number(message.recognition_id),
    artist: message.artist || "",
    album: message.album || null,
    album_id:
      message.album_id === null || message.album_id === undefined
        ? null
        : Number(message.album_id),
    song: message.song || "",
    cover_art_url: message.cover_art_url || null,
    created_at: message.created_at || null,
  };
}

export async function fetchStation(stationName) {
  return request(`/station/${encodeURIComponent(stationName)}`);
}

export async function fetchCurrentRecognition(stationName) {
  const recognition = await request(
    `/recognitions/station/${encodeURIComponent(stationName)}`,
  );

  return {
    id: Number(recognition.id),
    artist: recognition.artist || "",
    album: recognition.album || null,
    album_id:
      recognition.album_id === null || recognition.album_id === undefined
        ? null
        : Number(recognition.album_id),
    song: recognition.song || "",
    cover_art_url: recognition.cover_art_url || null,
    created_at: recognition.created_at || null,
  };
}

export async function fetchStreamStatus(mountpoint) {
  const status = await request(`/stream-status/${encodeURIComponent(mountpoint)}`);
  return status?.on_air === true;
}
