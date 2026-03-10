// Copyright 2026 MONADIC.US

import EmbeddedPlayer from "./components/EmbeddedPlayer";
import {
  getMissingStationMessage,
  resolvePlayerConfig,
} from "./lib/playerConfig";

export default function App() {
  const config = resolvePlayerConfig({
    envStationName: import.meta.env.VITE_STATION_NAME,
    search: window.location.search,
  });

  if (!config.stationName) {
    return (
      <main className="app-shell">
        <section className="player-card player-card--empty">
          <div className="setup-copy">
            <p className="eyebrow">Wax Player</p>
            <h1>Station not configured</h1>
            <p>{getMissingStationMessage()}</p>
            <code>VITE_STATION_NAME=my-station</code>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <EmbeddedPlayer
        stationName={config.stationName}
        autoplay={config.autoplay}
        defaultMuted={config.muted}
      />
    </main>
  );
}
