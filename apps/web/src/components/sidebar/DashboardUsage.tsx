import { useAtomValue } from "@effect/atom-react";
import { refreshUsageLimits } from "@t3tools/client-runtime/state/usage";
import { collectLimitAccounts, collectLimitPools } from "@t3tools/shared/usageLimits";
import { useEffect, useEffectEvent } from "react";
import { environmentPresentations } from "../../state/presentation";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { DashboardLimits } from "./DashboardLimits";

export function DashboardUsage({ now }: { now: number }) {
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  const refreshProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    reportFailure: false,
  });
  const connected = [...presentations]
    .filter(([, p]) => p.connection.phase === "connected" && p.serverConfig !== null)
    .map(([id]) => id)
    .sort()
    .join(",");
  const refresh = useEffectEvent(() => {
    void Promise.allSettled(
      [...presentations].map(([id, p]) => {
        if (p.connection.phase !== "connected" || p.serverConfig === null) return;
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
  return <DashboardLimits pools={collectLimitPools(collectLimitAccounts(presentations), now)} />;
}
