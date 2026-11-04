import { enumerateDays, enumerateHourStarts } from "@t3tools/shared/usageFormat";
import type { HourlyTotals } from "@t3tools/shared/usageMerge";

export function dashboardCalendarDays(sinceDay: string, untilDay: string) {
  const first = new Date(`${sinceDay}T00:00:00Z`);
  const last = new Date(`${untilDay}T00:00:00Z`);
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  last.setUTCDate(last.getUTCDate() + ((7 - last.getUTCDay()) % 7));
  return enumerateDays(first.toISOString().slice(0, 10), last.toISOString().slice(0, 10));
}

export function dashboardHourSeries(
  hourly: readonly HourlyTotals[],
  sinceTime: string,
  untilTime: string,
) {
  const byHour = new Map(hourly.map((hour) => [Date.parse(hour.hourStart), hour.totalTokens]));
  const totals = enumerateHourStarts(sinceTime, untilTime).map((hourStart) => ({
    hourStart,
    totalTokens: byHour.get(Date.parse(hourStart)) ?? 0,
  }));
  return totals.map((hour, index) => {
    const recent = totals.slice(Math.max(0, index - 2), index + 1);
    return {
      ...hour,
      averageTokens: recent.reduce((total, entry) => total + entry.totalTokens, 0) / recent.length,
    };
  });
}

export function dashboardTimeLabel(instant: string, timeZone: string, includeDate = false) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(includeDate ? ({ month: "short", day: "numeric", timeZoneName: "short" } as const) : {}),
  }).format(new Date(instant));
}
