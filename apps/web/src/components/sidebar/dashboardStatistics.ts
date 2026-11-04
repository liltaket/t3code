import { makeWindow } from "@t3tools/shared/usageFormat";

export const DASHBOARD_REFRESH_MS = 5 * 60_000;

export function dashboardHourWindow(now: number) {
  const end = Math.floor(now / DASHBOARD_REFRESH_MS) * DASHBOARD_REFRESH_MS;
  const start = end - 3_600_000;
  return {
    ...makeWindow(1, new Date(end), "hour"),
    sinceDay: makeWindow(1, new Date(start)).untilDay,
    sinceTime: new Date(start).toISOString(),
  };
}
