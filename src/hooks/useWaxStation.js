import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  fetchCurrentRecognition,
  fetchStation,
  fetchStreamStatus,
  mapLatestSongMessage,
  openStationSocket,
} from "../lib/waxApi";

const INITIAL_STATE = {
  station: null,
  recognition: null,
  onAir: false,
  loading: true,
  error: "",
  socketState: "idle",
};

function describeLoadError(error) {
  if (error?.status === 404) {
    return "The configured station was not found.";
  }
  return "WaxLive did not return station data.";
}

export function useWaxStation(stationName) {
  const [state, setState] = useState(INITIAL_STATE);
  const recognitionRefreshRef = useRef(() => Promise.resolve(null));

  const mergeState = useEffectEvent((nextState) => {
    startTransition(() => {
      setState((previous) => ({ ...previous, ...nextState }));
    });
  });

  const refreshRecognition = useEffectEvent(async () => {
    if (!stationName) return null;
    try {
      const recognition = await fetchCurrentRecognition(stationName);
      mergeState({ recognition });
      return recognition;
    } catch (error) {
      if (error?.status === 404) {
        mergeState({ recognition: null });
        return null;
      }
      return null;
    }
  });

  recognitionRefreshRef.current = refreshRecognition;

  useEffect(() => {
    if (!stationName) {
      setState({
        ...INITIAL_STATE,
        loading: false,
        error: "Missing station configuration.",
      });
      return undefined;
    }

    let cancelled = false;
    setState(INITIAL_STATE);

    (async () => {
      try {
        const [station, recognition] = await Promise.all([
          fetchStation(stationName),
          fetchCurrentRecognition(stationName).catch((error) => {
            if (error?.status === 404) return null;
            throw error;
          }),
        ]);

        if (cancelled) return;

        startTransition(() => {
          setState({
            station,
            recognition,
            onAir: Boolean(station.is_live),
            loading: false,
            error: "",
            socketState: "connecting",
          });
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          ...INITIAL_STATE,
          loading: false,
          error: describeLoadError(error),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stationName]);

  const handleSocketMessage = useEffectEvent((message) => {
    if (message.type === "on_air") {
      const nextOnAir = message.is_live === true;
      mergeState({ onAir: nextOnAir });
      if (!nextOnAir) {
        mergeState({ recognition: null });
        return;
      }
      if (nextOnAir) {
        recognitionRefreshRef.current();
      }
      return;
    }

    if (message.type === "latest_song") {
      mergeState({
        recognition: mapLatestSongMessage(message),
      });
    }
  });

  useEffect(() => {
    if (!state.station?.mountpoint || state.error) return undefined;

    let cancelled = false;
    let reconnectTimer = null;
    let reconnectDelay = 1000;
    let socket = null;

    const syncLiveState = async () => {
      try {
        const onAir = await fetchStreamStatus(state.station.mountpoint);
        if (cancelled) return;
        mergeState({ onAir });
        if (onAir) {
          recognitionRefreshRef.current();
        } else {
          mergeState({ recognition: null });
        }
      } catch {
        if (!cancelled) {
          mergeState({ socketState: "degraded" });
        }
      }
    };

    const connect = () => {
      if (cancelled) return;

      mergeState({ socketState: "connecting" });

      socket = openStationSocket(state.station.mountpoint);

      socket.addEventListener("open", () => {
        reconnectDelay = 1000;
        mergeState({ socketState: "connected" });
        syncLiveState();
      });

      socket.addEventListener("message", (event) => {
        try {
          handleSocketMessage(JSON.parse(event.data));
        } catch {
          mergeState({ socketState: "degraded" });
        }
      });

      socket.addEventListener("error", () => {
        mergeState({ socketState: "degraded" });
      });

      socket.addEventListener("close", () => {
        if (cancelled) return;
        mergeState({ socketState: "reconnecting" });
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [handleSocketMessage, mergeState, state.error, state.station?.mountpoint]);

  return {
    ...state,
    refreshRecognition,
  };
}
