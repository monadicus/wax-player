import { describe, expect, it } from "vitest";
import {
  getMissingStationMessage,
  normalizeStationName,
  parseBooleanParam,
  resolvePlayerConfig,
} from "./playerConfig";

describe("playerConfig", () => {
  it("normalizes station names", () => {
    expect(normalizeStationName("  /WaxStation ")).toBe("waxstation");
  });

  it("parses boolean query values", () => {
    expect(parseBooleanParam("1")).toBe(true);
    expect(parseBooleanParam("true")).toBe(true);
    expect(parseBooleanParam("0")).toBe(false);
    expect(parseBooleanParam(null)).toBe(false);
  });

  it("prefers a query station override", () => {
    expect(
      resolvePlayerConfig({
        envStationName: "home-station",
        search: "?station=guest-room&autoplay=1&muted=1",
      }),
    ).toEqual({
      stationName: "guest-room",
      autoplay: true,
      muted: true,
    });
  });

  it("falls back to the configured station", () => {
    expect(
      resolvePlayerConfig({
        envStationName: "wax",
        search: "",
      }),
    ).toEqual({
      stationName: "wax",
      autoplay: false,
      muted: false,
    });
  });

  it("describes missing configuration", () => {
    expect(getMissingStationMessage()).toMatch("VITE_STATION_NAME");
  });
});
