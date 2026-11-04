import { useAtomValue } from "@effect/atom-react";
import { refreshUsageLimits } from "@t3tools/client-runtime/state/usage";
import type { EnvironmentId } from "@t3tools/contracts";
import { collectLimitAccounts, collectLimitPools } from "@t3tools/shared/usageLimits";
import { useEffect, useEffectEvent } from "react";
import { environmentPresentations } from "../../state/presentation";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { DashboardLimits } from "./DashboardLimits";

export function DashboardUsage({
  now,
  selectedEnvironmentId,
}: {
  now: number;
  selectedEnvironmentId: EnvironmentId | null;
}) {
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  const refreshProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    reportFailure: false,
  });
  const connected = [...presentations]
    .filter(
      ([id, p]) =>
        p.connection.phase === "connected" &&
        p.serverConfig !== null &&
        (selectedEnvironmentId === null || selectedEnvironmentId === id),
    )
    .map(([id]) => id)
    .sort()
    .join(",");
  const refresh = useEffectEvent(() => {
    void Promise.allSettled(
      [...presentations].map(([id, p]) => {
        if (
          p.connection.phase !== "connected" ||
          p.serverConfig === null ||
          (selectedEnvironmentId !== null && selectedEnvironmentId !== id)
        )
          return;
        return refreshUsageLimits(
          id,
          () => refreshProviders({ environmentId: id, input: {} }),
          true,
        );
      }),
    );
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- reads quotas when the dashboard opens or connected environments change
  useEffect(() => {
    if (connected) refresh();
  }, [connected]);
  return (
    <DashboardLimits
      pools={collectLimitPools(
        collectLimitAccounts(
          new Map(
            [...presentations].filter(
              ([id]) => selectedEnvironmentId === null || selectedEnvironmentId === id,
            ),
          ),
        ),
        now,
      )}
    />
  );
}
