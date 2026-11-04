import { describe, expect, it } from "vite-plus/test";
import { dashboardHourWindow } from "./dashboardStatistics";

describe("dashboard usage window", () => {
  it.each([
    ["2026-11-04T00:03:45Z", "2026-11-03T23:00:00.000Z", "2026-11-04T00:00:00.000Z"],
    ["2026-10-25T01:18:59Z", "2026-10-25T00:15:00.000Z", "2026-10-25T01:15:00.000Z"],
    ["2026-03-29T01:07:00Z", "2026-03-29T00:05:00.000Z", "2026-03-29T01:05:00.000Z"],
  ])("requests exactly one rolling hour across midnight and DST: %s", (now, start, end) => {
    const window = dashboardHourWindow(Date.parse(now));
    expect(window.sinceTime).toBe(start);
    expect(window.untilTime).toBe(end);
    expect(Date.parse(window.untilTime!) - Date.parse(window.sinceTime)).toBe(3_600_000);
    expect(dashboardHourWindow(Date.parse(end) + 60_000)).toEqual(window);
  });
});
