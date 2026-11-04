import { useAtomValue } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import { refreshUsageLimits } from "@t3tools/client-runtime/state/usage";
import {
  collectLimitAccounts,
  collectLimitPools,
  collectLimitNotices,
  collectExternalUsageLinks,
  displayLimitWindows,
} from "@t3tools/shared/usageLimits";
import { useEffect, useEffectEvent } from "react";
import type { EnvironmentId } from "@t3tools/contracts";
import { environmentPresentations } from "../../state/presentation";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { providerClients } from "../settings/providerDriverMeta";
import { barColor } from "../usage/UsageLimits";

export function DashboardUsage({
  now,
  environmentId,
}: {
  now: number;
  environmentId: EnvironmentId | null;
}) {
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  const selected = new Map(
    [...presentations].filter(([id]) => environmentId === null || id === environmentId),
  );
  const refreshProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    reportFailure: false,
  });
  const connected = [...selected]
    .filter(([, p]) => p.connection.phase === "connected" && p.serverConfig !== null)
    .map(([id]) => id)
    .sort()
    .join(",");
  const refresh = useEffectEvent(() => {
    void Promise.allSettled(
      [...selected].map(([id, p]) => {
        if (p.connection.phase !== "connected" || p.serverConfig === null) return;
        return refreshUsageLimits(
          id,
          () => refreshProviders({ environmentId: id, input: {} }),
          true,
        );
      }),
    );
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- reads server quotas when the dashboard opens or its connected environment scope changes
  useEffect(() => {
    if (connected) refresh();
  }, [connected]);
  const pools = collectLimitPools(collectLimitAccounts(selected), now);
  const notices = collectLimitNotices(selected);
  const external = collectExternalUsageLinks(selected);
  return (
    <section aria-labelledby="dashboard-usage-heading" className="min-w-0">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 id="dashboard-usage-heading" className="text-base font-semibold">
          Usage & limits
        </h2>
        <Link
          to="/usage"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          All usage
        </Link>
      </div>
      <div className="space-y-6">
        {pools.map((pool) => {
          const label = providerClients.get(pool.driver)?.label ?? String(pool.driver);
          return (
            <div key={pool.driver} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ProviderInstanceIcon driverKind={pool.driver} displayName={label} size="compact" />
                <span>{label}</span>
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {pool.accounts.length} {pool.accounts.length === 1 ? "account" : "accounts"}
                </span>
              </div>
              {displayLimitWindows(pool).map((window) => (
                <div key={window.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{window.label}</span>
                    <span className="tabular-nums">{window.remainingPercent}% left</span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`${label} ${window.label} remaining`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={window.remainingPercent}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${window.remainingPercent}%`,
                        backgroundColor: barColor(pool.driver),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {pools.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No connected account reports subscription limits here.
          </p>
        ) : null}
        {notices.map((notice) => (
          <p key={notice} className="text-xs text-warning">
            {notice}
          </p>
        ))}
        {external.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-muted-foreground underline underline-offset-4"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
