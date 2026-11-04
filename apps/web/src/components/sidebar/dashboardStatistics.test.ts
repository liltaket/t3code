import { describe, expect, it } from "vite-plus/test";
import {
  dashboardCalendarDays,
  dashboardHourSeries,
  dashboardTimeLabel,
} from "./dashboardStatistics";

describe("dashboard statistics", () => {
  it("aligns calendar weeks across month, leap day and year boundaries", () => {
    const leap = dashboardCalendarDays("2024-02-27", "2024-03-04");
    expect(leap).toHaveLength(14);
    expect(leap[0]).toBe("2024-02-26");
    expect(leap.at(-1)).toBe("2024-03-10");
    expect(leap).toContain("2024-02-29");
    const year = dashboardCalendarDays("2025-12-31", "2026-01-01");
    expect(year[0]).toBe("2025-12-29");
    expect(year.at(-1)).toBe("2026-01-04");
  });

  it("keeps repeated DST hours distinct and includes silent hours in the rolling mean", () => {
    const hour = (hourStart: string, totalTokens: number) => ({
      day: "2026-10-25",
      hourStart,
      totalTokens,
      costUsd: 0,
      byProvider: new Map(),
    });
    const series = dashboardHourSeries(
      [
        hour("2026-10-25T02:00:00+02:00", 60),
        hour("2026-10-25T02:00:00+01:00", 120),
        hour("2026-10-25T04:00:00Z", 900),
      ],
      "2026-10-25T00:00:00.000Z",
      "2026-10-25T04:00:00.000Z",
    );
    expect(series.map((entry) => entry.totalTokens)).toEqual([60, 120, 0, 0]);
    expect(series.map((entry) => entry.averageTokens)).toEqual([60, 90, 60, 40]);
    expect(series.map((entry) => entry.hourStart)).toEqual([
      "2026-10-25T00:00:00.000Z",
      "2026-10-25T01:00:00.000Z",
      "2026-10-25T02:00:00.000Z",
      "2026-10-25T03:00:00.000Z",
    ]);
    const rolling = dashboardHourSeries(
      [hour("2026-10-25T13:15:00Z", 120), hour("2026-10-25T14:15:00Z", 240)],
      "2026-10-25T12:15:00.000Z",
      "2026-10-25T15:15:00.000Z",
    );
    expect(rolling.map((entry) => entry.totalTokens)).toEqual([0, 120, 240]);
    expect(rolling.at(-1)?.averageTokens).toBe(120);
    expect(dashboardTimeLabel(rolling.at(-1)!.hourStart, "Europe/Stockholm")).toBe("15:15");
  });
});
