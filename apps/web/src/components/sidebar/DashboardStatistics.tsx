import { EnvironmentId, USAGE_CONTRACT_VERSION } from "@t3tools/contracts";
import { formatCount, formatDayShort, formatTokens, makeWindow } from "@t3tools/shared/usageFormat";
import { isCompatibleUsageContractVersion } from "@t3tools/shared/usageMerge";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { mergeAnsweredUsage, useUsage } from "../../state/usage";
import { Button } from "../ui/button";
import { RefreshIcon } from "../ui/refresh-icon";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { PROVIDER_PRESENTATION } from "../usage/usageProviders";
import {
  dashboardCalendarDays,
  dashboardHourSeries,
  dashboardTimeLabel,
} from "./dashboardStatistics";

const HOUR_MS = 3_600_000;
const REFRESH_INTERVAL_MS = 5 * 60_000;

export function DashboardStatistics({
  now,
  selectedEnvironmentId,
  onSelectedEnvironmentIdChange,
}: {
  readonly now: number;
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly onSelectedEnvironmentIdChange: (environmentId: EnvironmentId | null) => void;
}) {
  const { sinceDay, untilDay, timeZone } = makeWindow(28, new Date(now));
  // oxlint-disable-next-line t3code/no-manual-memo -- useUsage synchronizes retained data by input identity
  const dayWindow = useMemo(
    () => ({ sinceDay, untilDay, timeZone, resolution: "day" as const }),
    [sinceDay, untilDay, timeZone],
  );
  const hourEnd = Math.floor(now / REFRESH_INTERVAL_MS) * REFRESH_INTERVAL_MS;
  // oxlint-disable-next-line t3code/no-manual-memo -- useUsage synchronizes retained data by input identity
  const hourWindow = useMemo(
    () => ({ ...makeWindow(1, new Date(hourEnd), "hour"), timeZone }),
    [hourEnd, timeZone],
  );
  // oxlint-disable-next-line t3code/no-manual-memo -- useUsage synchronizes environment selection by Set identity
  const selection = useMemo(
    () => (selectedEnvironmentId === null ? null : new Set([selectedEnvironmentId])),
    [selectedEnvironmentId],
  );
  const daily = useUsage(dayWindow, selection);
  const hourly = useUsage(hourWindow, selection);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);
  const refreshedBoundary = useRef(hourEnd);
  const refreshDaily = useEffectEvent(() => {
    if (!refreshInFlight.current) void Promise.allSettled([daily.refresh()]);
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- refreshes the retained daily usage report as the dashboard clock crosses each five-minute boundary
  useEffect(() => {
    if (refreshedBoundary.current === hourEnd) return;
    refreshedBoundary.current = hourEnd;
    refreshDaily();
  }, [hourEnd]);
  const selectedDay =
    pickedDay !== null && pickedDay >= dayWindow.sinceDay && pickedDay <= dayWindow.untilDay
      ? pickedDay
      : dayWindow.untilDay;
  const selected = mergeAnsweredUsage(
    daily.selectedEnvironments,
    (bucket) => bucket.day === selectedDay,
  );
  const latestHour = new Date(hourEnd - HOUR_MS).toISOString();
  const recent = mergeAnsweredUsage(
    hourly.selectedEnvironments,
    (bucket) =>
      bucket.hourStart !== undefined && Date.parse(bucket.hourStart) === hourEnd - HOUR_MS,
  );
  const hours = dashboardHourSeries(
    hourly.merged.hourly,
    hourWindow.sinceTime!,
    hourWindow.untilTime!,
  );
  const hasDaily = daily.selectedEnvironments.some(
    ({ summary }) =>
      summary !== null &&
      isCompatibleUsageContractVersion(summary.contractVersion, USAGE_CONTRACT_VERSION),
  );
  const hasHourly = hourly.selectedEnvironments.some(
    ({ summary }) =>
      summary !== null &&
      isCompatibleUsageContractVersion(summary.contractVersion, USAGE_CONTRACT_VERSION),
  );
  const coverage = [
    ...daily.selectedEnvironments.map((environment) => ({ environment, resolution: "daily" })),
    ...hourly.selectedEnvironments.map((environment) => ({ environment, resolution: "hourly" })),
  ].filter(
    ({ environment }) =>
      !environment.isConnected ||
      environment.isPending ||
      environment.error !== null ||
      environment.summary === null ||
      environment.summary.sources.some(
        (source) => source.status === "partial" || source.status === "failed" || source.refreshing,
      ),
  );
  const mismatches = [
    ...daily.merged.contractMismatches.map((mismatch) => ({ mismatch, resolution: "daily" })),
    ...hourly.merged.contractMismatches.map((mismatch) => ({ mismatch, resolution: "hourly" })),
  ];
  const readAt = [...daily.selectedEnvironments, ...hourly.selectedEnvironments]
    .flatMap(({ summary }) => (summary === null ? [] : [summary.readAt]))
    .sort()[0];
  const days = dashboardCalendarDays(dayWindow.sinceDay, dayWindow.untilDay);
  const byDay = new Map(daily.merged.daily.map((day) => [day.day, day.totalTokens]));
  const maxDay = Math.max(1, ...byDay.values());
  const breakdown = [
    { label: "Input", value: selected.uncachedInputTokens, opacity: 0.48 },
    {
      label: "Cache",
      value: selected.cachedInputTokens + selected.cacheCreationTokens,
      opacity: 0.26,
    },
    { label: "Output", value: selected.outputTokens, opacity: 0.82 },
  ];
  const refresh = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    await Promise.allSettled([daily.refresh(), hourly.refresh()]);
    refreshInFlight.current = false;
    setRefreshing(false);
  };

  return (
    <div className="@container/dashboard-statistics min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {readAt ? (
            <>
              Updated{" "}
              <time dateTime={readAt}>
                {new Date(readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </time>
            </>
          ) : daily.isPending ? (
            <span role="status">Reading usage…</span>
          ) : (
            "Usage from your connected environments"
          )}
        </p>
        <div className="flex min-w-0 items-center gap-1">
          <Select
            value={selectedEnvironmentId ?? "all"}
            onValueChange={(value) => {
              if (value === null) return;
              onSelectedEnvironmentIdChange(value === "all" ? null : EnvironmentId.make(value));
            }}
          >
            <SelectTrigger
              variant="ghost"
              size="compact"
              aria-label="Dashboard environment"
              className="w-auto max-w-56"
            >
              <SelectValue>
                {selectedEnvironmentId === null
                  ? "All environments"
                  : (daily.environments.find(
                      (environment) => environment.environmentId === selectedEnvironmentId,
                    )?.label ?? "Environment unavailable")}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup align="end" alignItemWithTrigger={false}>
              <SelectItem value="all">All environments</SelectItem>
              {daily.environments.map((environment) => (
                <SelectItem key={environment.environmentId} value={environment.environmentId}>
                  {environment.label}
                  {environment.isConnected ? "" : " · disconnected"}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Button
            variant="ghost-muted"
            size="icon-sm"
            aria-label="Refresh dashboard usage"
            aria-busy={refreshing}
            disabled={
              refreshing ||
              !daily.selectedEnvironments.some((environment) => environment.canReadDiagnostics)
            }
            onClick={() => void refresh()}
          >
            <RefreshIcon refreshing={refreshing} />
          </Button>
        </div>
      </div>

      {coverage.length > 0 || mismatches.length > 0 ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer rounded outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            {hasDaily || hasHourly ? "Usage coverage is incomplete" : "Usage is not available yet"}
          </summary>
          <ul className="mt-2 space-y-1">
            {coverage.map(({ environment, resolution }) => (
              <li key={`${resolution}:${environment.environmentId}`}>
                {environment.label} ({resolution}):{" "}
                {environment.error ??
                  (!environment.isConnected
                    ? "disconnected"
                    : !environment.canReadDiagnostics
                      ? "usage access is not available"
                      : environment.isPending
                        ? "still scanning"
                        : "some provider records are unavailable")}
              </li>
            ))}
            {mismatches.map(({ mismatch, resolution }) => (
              <li key={`${resolution}:${mismatch.environmentId}`}>
                {
                  daily.environments.find(
                    (environment) => environment.environmentId === mismatch.environmentId,
                  )?.label
                }
                ({resolution}): update{" "}
                {mismatch.direction === "serverBehind" ? "the server" : "this client"} to include
                its usage.
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <section aria-labelledby="dashboard-burn-heading">
        <div className="grid items-end gap-3 @lg/dashboard-statistics:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
          <div>
            <h2 id="dashboard-burn-heading" className="text-sm font-medium">
              Burn rate
            </h2>
            <p className="text-xs text-muted-foreground">
              Last 60 minutes · {dashboardTimeLabel(latestHour, hourWindow.timeZone)}–
              {dashboardTimeLabel(hourWindow.untilTime!, hourWindow.timeZone)}
            </p>
            <p className="mt-1 text-4xl font-medium tracking-tight tabular-nums">
              {hasHourly ? formatTokens(recent.totalTokens / 60) : "N/A"}
              <span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">
                tokens/min
              </span>
            </p>
          </div>
          <div>
            <p className="text-xl font-medium tabular-nums">
              {hasHourly
                ? `≈${(recent.outputTokens / 3600).toLocaleString([], { maximumFractionDigits: 1 })}`
                : "N/A"}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                output tokens/s
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hourly average of reported usage, including idle time. Not the model’s decode speed.
            </p>
          </div>
        </div>
        {hasHourly ? (
          <BurnChart hours={hours} timeZone={hourWindow.timeZone} />
        ) : (
          <div
            className="flex h-40 items-center justify-center text-sm text-muted-foreground"
            role="status"
          >
            {hourly.isPending
              ? "Reading hourly usage…"
              : "Connect an environment with usage access to see the chart."}
          </div>
        )}
      </section>

      <section
        aria-label="Tokens by day"
        className="grid gap-7 border-t border-border pt-5 @lg/dashboard-statistics:grid-cols-[14rem_minmax(0,1fr)]"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Tokens by day</h2>
            <span className="text-2xs text-muted-foreground">28 days</span>
          </div>
          <div
            className="mt-2 grid grid-cols-7 gap-1 text-center text-3xs text-muted-foreground"
            aria-hidden
          >
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
              (label) => (
                <span key={label}>{label[0]}</span>
              ),
            )}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const inRange = day >= dayWindow.sinceDay && day <= dayWindow.untilDay;
              const tokens = byDay.get(day) ?? 0;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!inRange}
                  aria-pressed={day === selectedDay}
                  aria-current={day === dayWindow.untilDay ? "date" : undefined}
                  aria-label={`${formatDayShort(day)}: ${hasDaily && inRange ? `${formatCount(tokens)} tokens` : "usage unavailable"}`}
                  onClick={() => setPickedDay(day === dayWindow.untilDay ? null : day)}
                  onKeyDown={(event) => {
                    const offset =
                      event.key === "ArrowLeft"
                        ? -1
                        : event.key === "ArrowRight"
                          ? 1
                          : event.key === "ArrowUp"
                            ? -7
                            : event.key === "ArrowDown"
                              ? 7
                              : null;
                    if (offset === null) return;
                    event.preventDefault();
                    const buttons =
                      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                        "button",
                      );
                    buttons?.[days.indexOf(day) + offset]?.focus();
                  }}
                  className="relative h-8 rounded-sm text-center text-2xs tabular-nums outline-hidden hover:ring-1 hover:ring-foreground/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-25 aria-pressed:z-10 aria-pressed:ring-2 aria-pressed:ring-inset aria-pressed:ring-foreground aria-[current=date]:font-semibold aria-[current=date]:underline aria-[current=date]:decoration-2 aria-[current=date]:underline-offset-4"
                  style={{
                    backgroundColor:
                      inRange && hasDaily
                        ? `color-mix(in srgb, var(--foreground) ${tokens === 0 ? 3 : 8 + Math.sqrt(tokens / maxDay) * 36}%, transparent)`
                        : undefined,
                  }}
                >
                  {Number(day.slice(-2))}
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-sm font-medium">
              {selectedDay === dayWindow.untilDay ? "Today" : formatDayShort(selectedDay)}
            </h2>
            <span className="text-xs text-muted-foreground">
              {selectedDay === dayWindow.untilDay ? formatDayShort(selectedDay) : selectedDay}
            </span>
            {pickedDay !== null ? (
              <Button variant="ghost-muted" size="xs" onClick={() => setPickedDay(null)}>
                Back to today
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-3xl font-medium tracking-tight tabular-nums">
            {hasDaily ? formatTokens(selected.totalTokens) : "N/A"}
            <span className="ml-1.5 text-xs font-normal tracking-normal text-muted-foreground">
              tokens
            </span>
          </p>
          {hasDaily ? (
            <>
              <div
                role="img"
                aria-label={breakdown
                  .map((part) => `${part.label}: ${formatCount(part.value)} tokens`)
                  .join(", ")}
                className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted"
              >
                {breakdown
                  .filter((part) => part.value > 0)
                  .map((part) => (
                    <span
                      key={part.label}
                      className="h-full bg-foreground"
                      style={{ flex: part.value, opacity: part.opacity }}
                    />
                  ))}
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-3">
                {breakdown.map((part) => (
                  <div key={part.label}>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-xs bg-foreground"
                        style={{ opacity: part.opacity }}
                      />
                      {part.label}
                    </dt>
                    <dd className="mt-0.5 text-sm tabular-nums">{formatTokens(part.value)}</dd>
                  </div>
                ))}
              </dl>
              {selected.totalTokens === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  No reported usage for this day.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {selected.providers
                    .filter((provider) => provider.totalTokens > 0)
                    .map((provider) => (
                      <li key={provider.provider} className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {PROVIDER_PRESENTATION[provider.provider].label}
                        </span>
                        <span className="tabular-nums">{formatTokens(provider.totalTokens)}</span>
                      </li>
                    ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {daily.isPending
                ? "Reading daily usage…"
                : "No usage report is available for this selection."}
            </p>
          )}
        </div>
      </section>
      {daily.merged.duplicateSources.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Shared usage sources are counted once across environments.
        </p>
      ) : null}
    </div>
  );
}

function BurnChart({
  hours,
  timeZone,
}: {
  readonly hours: ReturnType<typeof dashboardHourSeries>;
  readonly timeZone: string;
}) {
  const [inspected, setInspected] = useState<number | null>(null);
  const selected = hours[inspected ?? hours.length - 1];
  const maximum = Math.max(1, ...hours.map((hour) => hour.totalTokens));
  const width = 720;
  const plotHeight = 110;
  const step = width / Math.max(1, hours.length);
  const caption = selected
    ? `${dashboardTimeLabel(selected.hourStart, timeZone, true)}: ${formatTokens(selected.totalTokens)} tokens · 3-hour average ${formatTokens(selected.averageTokens)}`
    : "No hourly records";
  return (
    <div
      className="mt-3 rounded outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      role="group"
      aria-label="Token usage for the last 24 hours. Use left and right arrows to inspect hourly totals."
      tabIndex={0}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        setInspected((previous) =>
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? hours.length - 1
              : Math.max(
                  0,
                  Math.min(
                    hours.length - 1,
                    (previous ?? hours.length - 1) + (event.key === "ArrowLeft" ? -1 : 1),
                  ),
                ),
        );
      }}
      onBlur={() => setInspected(null)}
      onPointerLeave={() => setInspected(null)}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setInspected(
          Math.max(
            0,
            Math.min(
              hours.length - 1,
              Math.floor(((event.clientX - rect.left) / rect.width) * hours.length),
            ),
          ),
        );
      }}
    >
      <p className="mb-2 min-h-4 text-2xs text-muted-foreground" aria-live="polite">
        {inspected === null ? "Hourly totals · line: 3-hour average · last 24 hours" : caption}
      </p>
      <svg
        viewBox={`0 0 ${width} ${plotHeight}`}
        preserveAspectRatio="none"
        className="h-28 w-full overflow-visible"
        aria-hidden
      >
        {[0, 0.5, 1].map((fraction) => (
          <line
            key={fraction}
            x1={0}
            x2={width}
            y1={plotHeight * fraction}
            y2={plotHeight * fraction}
            className="stroke-border"
            strokeWidth={0.7}
          />
        ))}
        {hours.map((hour, index) => (
          <rect
            key={hour.hourStart}
            x={index * step + 2}
            y={plotHeight - (hour.totalTokens / maximum) * plotHeight}
            width={Math.max(1, step - 4)}
            height={(hour.totalTokens / maximum) * plotHeight}
            rx={1}
            className={
              index === (inspected ?? hours.length - 1)
                ? "fill-foreground/40"
                : "fill-foreground/15"
            }
          />
        ))}
        <polyline
          points={hours
            .map(
              (hour, index) =>
                `${(index + 0.5) * step},${plotHeight - (hour.averageTokens / maximum) * plotHeight}`,
            )
            .join(" ")}
          fill="none"
          className="stroke-foreground/65"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-3xs text-muted-foreground" aria-hidden>
        <span>{hours[0] ? dashboardTimeLabel(hours[0].hourStart, timeZone) : ""}</span>
        <span>{hours[12] ? dashboardTimeLabel(hours[12].hourStart, timeZone) : ""}</span>
        <span>{hours.at(-1) ? dashboardTimeLabel(hours.at(-1)!.hourStart, timeZone) : ""}</span>
      </div>
    </div>
  );
}
