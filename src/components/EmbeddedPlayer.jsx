import { useEffect, useMemo, useRef, useState } from "react";
import { useWaxStation } from "../hooks/useWaxStation";
import { buildStationArtworkUrl, buildStreamUrl } from "../lib/waxApi";

const FALLBACK_ART =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 320'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2318181b'/%3E%3Cstop offset='1' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='320' rx='36' fill='url(%23g)'/%3E%3Ccircle cx='160' cy='160' r='88' fill='rgba(255,255,255,0.12)'/%3E%3Ccircle cx='160' cy='160' r='22' fill='%23fff7ed'/%3E%3C/svg%3E";

function formatUpdatedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6.25v11.5l9-5.75-9-5.75Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.5 5.75h3v12.5h-3V5.75Zm6 0h3v12.5h-3V5.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function VolumeIcon({ muted }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 9.5h4l5-4.5v14l-5-4.5H4v-5Zm10.55 2.5 3.35-3.35 1.4 1.4L15.95 13.4l3.35 3.35-1.4 1.4L14.55 14.8l-3.35 3.35-1.4-1.4 3.35-3.35-3.35-3.35 1.4-1.4L14.55 12Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 9.5h4l5-4.5v14l-5-4.5H4v-5Zm11.5-2.11a6 6 0 0 1 0 9.22l-1.36-1.47a4 4 0 0 0 0-6.28l1.36-1.47Zm2.84-2.85a10 10 0 0 1 0 14.92l-1.37-1.46a8 8 0 0 0 0-12l1.37-1.46Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export default function EmbeddedPlayer({
  stationName,
  autoplay = false,
  defaultMuted = false,
}) {
  const { station, recognition, onAir, loading, error, refreshRecognition } =
    useWaxStation(stationName);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(defaultMuted);
  const [volume, setVolume] = useState(0.8);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState("");
  const autoplayAttemptedRef = useRef(false);

  const stationTitle = station?.title?.trim() || station?.station_name || stationName;
  const streamUrl = station ? buildStreamUrl(station.mountpoint) : "";
  const stationUrl = `https://wax.live/${stationName}`;
  const artUrl = useMemo(() => {
    if (recognition?.cover_art_url) {
      return recognition.cover_art_url;
    }
    if (station?.cover_art_url) {
      return buildStationArtworkUrl(station.station_name);
    }
    return FALLBACK_ART;
  }, [recognition?.cover_art_url, station?.cover_art_url, station?.station_name]);
  const updatedAt = formatUpdatedAt(recognition?.created_at);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (onAir) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    setAudioBusy(false);
  }, [onAir]);

  useEffect(() => {
    autoplayAttemptedRef.current = false;
  }, [streamUrl]);

  useEffect(() => {
    if (!autoplay || autoplayAttemptedRef.current || !streamUrl || !onAir) return;
    autoplayAttemptedRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;
    setAudioBusy(true);
    audio
      .play()
      .catch(() => {
        setAudioBusy(false);
        setAudioError("Autoplay was blocked. Press play to start the stream.");
      });
  }, [autoplay, onAir, streamUrl]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !onAir) return;

    setAudioError("");

    if (!audio.paused) {
      audio.pause();
      return;
    }

    setAudioBusy(true);

    try {
      await audio.play();
    } catch {
      setAudioBusy(false);
      setAudioError("Playback failed. Press play again after the stream is live.");
    }
  };

  const toggleMute = () => {
    setIsMuted((value) => !value);
  };

  const handleVolumeChange = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    if (nextVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handlePlay = () => {
      setIsPlaying(true);
      setAudioBusy(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setAudioBusy(false);
    };
    const handleWaiting = () => {
      setAudioBusy(true);
    };
    const handleCanPlay = () => {
      setAudioBusy(false);
    };
    const handleError = () => {
      setIsPlaying(false);
      setAudioBusy(false);
      setAudioError("The stream could not be loaded right now.");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <section className="player-card" aria-busy={loading}>
      <audio ref={audioRef} src={streamUrl} preload="none" playsInline />
      <img
        className="artwork"
        src={artUrl}
        alt={`${stationTitle} artwork`}
        loading="eager"
      />

      <div className="player-content">
        <div className="player-header">
          <div>
            <h1>{stationTitle}</h1>
          </div>

          <div className="status-group">
            <span className={`status-pill ${onAir ? "status-pill--live" : ""}`}>
              <span className="status-dot" />
              {onAir ? "Live" : "Off air"}
            </span>
            <a href={stationUrl} target="_blank" rel="noreferrer">
              Open station
            </a>
          </div>
        </div>

        <div className="track-panel" aria-live="polite">
          {loading ? (
            <div className="message-stack">
              <p className="track-title">Loading station…</p>
              <p className="track-meta">Pulling stream and recognition details.</p>
            </div>
          ) : error ? (
            <div className="message-stack">
              <p className="track-title">Unable to load station</p>
              <p className="track-meta">{error}</p>
            </div>
          ) : recognition?.song && recognition?.artist ? (
            <div className="message-stack">
              <p className="track-title">{recognition.song}</p>
              <p className="track-meta">
                {recognition.artist}
                {recognition.album ? ` • ${recognition.album}` : ""}
                {updatedAt ? ` • ${updatedAt}` : ""}
              </p>
            </div>
          ) : onAir ? (
            <div className="message-stack">
              <p className="track-title">Listening live</p>
              <p className="track-meta">
                Waiting for current track recognition.
                <button
                  className="inline-link"
                  type="button"
                  onClick={refreshRecognition}
                >
                  Refresh
                </button>
              </p>
            </div>
          ) : (
            <div className="message-stack">
              <p className="track-title">Station is currently off air</p>
              <p className="track-meta">
                The embed will update automatically when the stream returns.
              </p>
            </div>
          )}
        </div>

        <div className="player-controls">
          <button
            className="play-button"
            type="button"
            onClick={togglePlayback}
            disabled={!onAir || !station || Boolean(error)}
            aria-label={isPlaying ? "Pause stream" : "Play stream"}
          >
            {audioBusy ? <LoadingSpinner /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            className="mute-button"
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute stream" : "Mute stream"}
            disabled={!station || Boolean(error)}
          >
            <VolumeIcon muted={isMuted || volume === 0} />
          </button>

          <label className="volume-control">
            <span className="sr-only">Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              disabled={!station || Boolean(error)}
              aria-label="Volume"
            />
          </label>
        </div>

        {audioError ? <p className="error-banner">{audioError}</p> : null}
      </div>
    </section>
  );
}
