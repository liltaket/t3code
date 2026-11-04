import { USAGE_CONTRACT_VERSION } from "@t3tools/contracts";
import { formatTokens, makeWindow } from "@t3tools/shared/usageFormat";
import { isCompatibleUsageContractVersion } from "@t3tools/shared/usageMerge";
import { Link } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { useUsage } from "../../state/usage";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { DASHBOARD_REFRESH_MS, dashboardHourWindow } from "./dashboardStatistics";
import { DashboardUsage } from "./DashboardUsage";

export function DashboardStatistics({
  now,
  startedToday,
}: {
  now: number;
  startedToday: number | null;
}) {
  const { sinceDay, untilDay, timeZone } = makeWindow(1, new Date(now));
  // oxlint-disable-next-line t3code/no-manual-memo -- useUsage retains answered data by window identity
  const dayWindow = useMemo(
    () => ({ sinceDay, untilDay, timeZone, resolution: "day" as const }),
    [sinceDay, untilDay, timeZone],
  );
  const boundary = Math.floor(now / DASHBOARD_REFRESH_MS) * DASHBOARD_REFRESH_MS;
  // oxlint-disable-next-line t3code/no-manual-memo -- useUsage retains answered data by window identity
  const hourWindow = useMemo(() => dashboardHourWindow(boundary), [boundary]);
  const daily = useUsage(dayWindow);
  const hourly = useUsage(hourWindow);
  const refreshedBoundary = useRef(boundary);
  const refreshDaily = useEffectEvent(() => {
    void Promise.allSettled([daily.refresh()]);
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- refreshes today's retained report when the dashboard clock crosses a five-minute boundary
  useEffect(() => {
    if (refreshedBoundary.current === boundary) return;
    refreshedBoundary.current = boundary;
    refreshDaily();
  }, [boundary]);
  const hasReport = (view: ReturnType<typeof useUsage>) =>
    view.selectedEnvironments.some(
      ({ summary }) =>
        summary !== null &&
        isCompatibleUsageContractVersion(summary.contractVersion, USAGE_CONTRACT_VERSION),
    );
  const hasDaily = hasReport(daily);
  const hasHourly = hasReport(hourly);
  const incomplete = [daily, hourly].some(
    (view) =>
      view.merged.contractMismatches.length > 0 ||
      view.selectedEnvironments.some(
        (environment) =>
          !environment.isConnected ||
          environment.error !== null ||
          environment.isPending ||
          environment.summary === null ||
          environment.summary.sources.some(
            (source) =>
              source.status === "partial" || source.status === "failed" || source.refreshing,
          ),
      ),
  );
  const rate = hourly.merged.totalTokens / 60;
  const rateLabel = hasHourly
    ? rate < 1000
      ? rate.toLocaleString([], { maximumFractionDigits: 1 })
      : formatTokens(rate)
    : "N/A";
  return (
    <>
      <section aria-labelledby="dashboard-burn-heading" className="orbit-dashboard-burn">
        <div className="flex items-baseline gap-2.5 text-xs text-muted-foreground">
          <h2 id="dashboard-burn-heading" className="font-normal">
            Burn rate
          </h2>
          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="cursor-pointer rounded border-b border-dotted border-muted-foreground/40 text-2xs outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                />
              }
            >
              hourly average{incomplete ? " · partial" : ""}
            </PopoverTrigger>
            <PopoverPopup side="bottom" align="start" className="max-w-72">
              <div className="space-y-3 text-xs text-muted-foreground">
                <p>
                  Reported tokens over the last 60 minutes, divided by 60. Includes input, cache and
                  output, and idle time. This is not the model’s decoding speed.
                </p>
                <p>
                  Usage combines the connected environments you can access and updates every five
                  minutes.
                </p>
                {!hasDaily || !hasHourly ? (
                  <p role="status">
                    {daily.isPending || hourly.isPending
                      ? "Reading usage reports…"
                      : "No usage report is available yet. Connect an environment with usage access."}
                  </p>
                ) : null}
                {incomplete ? (
                  <p role="status">
                    Coverage is incomplete. Some environments are disconnected, still scanning,
                    unavailable, or need an update.
                  </p>
                ) : null}
                <Link
                  to="/usage"
                  className="rounded text-foreground underline underline-offset-4 outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  All usage and report details
                </Link>
              </div>
            </PopoverPopup>
          </Popover>
        </div>
        <p
          className="mt-1 flex items-baseline gap-2 text-5xl font-light leading-none tracking-tight tabular-nums"
          aria-label={hasHourly ? `${rateLabel} tokens per minute` : "Burn rate unavailable"}
        >
          {rateLabel}
          <span className="text-xs font-normal tracking-normal text-muted-foreground">
            tokens/min
          </span>
        </p>
      </section>
      <div className="orbit-dashboard-footer">
        <section aria-label="Today's usage" className="orbit-dashboard-today">
          <p
            aria-label={
              startedToday === null
                ? "Connecting to thread history"
                : `${startedToday} threads started today in loaded workspace history`
            }
          >
            <strong>{startedToday === null ? "N/A" : startedToday}</strong> threads today
          </p>
          <p>
            <strong>{hasDaily ? formatTokens(daily.merged.totalTokens) : "N/A"}</strong> tokens
            today
          </p>
        </section>
        <DashboardUsage now={now} />
      </div>
    </>
  );
}
