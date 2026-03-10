// Copyright 2026 MONADIC.US

import { startTransition, useEffect, useState } from "react";
import {
  fetchCurrentRecognition,
  fetchStation,
  fetchStreamStatus,
} from "../lib/waxApi";

const INITIAL_STATE = {
  station: null,
  recognition: null,
  onAir: false,
  loading: true,
  error: "",
};
const POLL_INTERVAL_MS = 15000;

function describeLoadError(error) {
  if (error?.status === 404) {
    return "The configured station was not found.";
  }
  return "WaxLive did not return station data.";
}

export function useWaxStation(stationName) {
  const [state, setState] = useState(INITIAL_STATE);

  const mergeState = (nextState) => {
    startTransition(() => {
      setState((previous) => ({ ...previous, ...nextState }));
    });
  };

  const refreshRecognition = async () => {
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
  };

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

  useEffect(() => {
    if (!state.station?.mountpoint || state.error) return undefined;

    let cancelled = false;
    const refreshRecognitionForPoll = async () => {
      try {
        const recognition = await fetchCurrentRecognition(stationName);
        if (!cancelled) {
          mergeState({ recognition });
        }
      } catch (error) {
        if (!cancelled && error?.status === 404) {
          mergeState({ recognition: null });
        }
      }
    };

    const refreshState = async () => {
      try {
        const onAir = await fetchStreamStatus(state.station.mountpoint);
        if (cancelled) return;

        mergeState({ onAir });

        if (onAir) {
          await refreshRecognitionForPoll();
        } else {
          mergeState({ recognition: null });
        }
      } catch {
        if (!cancelled) {
          mergeState({});
        }
      }
    };

    const intervalId = window.setInterval(refreshState, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [state.error, state.station?.mountpoint, stationName]);

  return {
    ...state,
    refreshRecognition,
  };
}
