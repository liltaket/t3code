import { useAtomValue } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import * as Schema from "effect/Schema";
import { useEffect, useEffectEvent, useState } from "react";
import { refreshUsageLimits } from "@t3tools/client-runtime/state/usage";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useNowMinute } from "../../hooks/useNowMinute";
import { appAtomRegistry } from "../../rpc/atomRegistry";
import { useQuietThreadShells } from "../../state/entities";
import { liveShellEnvironmentIdsAtom } from "../../state/shell";
import { environmentPresentations } from "../../state/presentation";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { useSnoozeWakeClock } from "../Sidebar.logic";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Switch } from "../ui/switch";
import { useSidebar } from "../ui/sidebar";
import { UsageLimitsSection } from "../usage/UsageLimits";
import { dashboardAutoState, dashboardThreads, allDashboardThreadsBusy } from "./dashboardState";
import { dashboardOpenAtom } from "./dashboardVisibility";

const NO_HIDDEN_PROVIDERS = new Set<never>();

function DashboardLimits({ now }: { now: number }) {
  const presentations = useAtomValue(environmentPresentations.presentationsAtom);
  const refreshProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    reportFailure: false,
  });
  const connectedEnvironments = [...presentations]
    .filter(
      ([, presentation]) =>
        presentation.connection.phase === "connected" && presentation.serverConfig !== null,
    )
    .map(([environmentId]) => environmentId)
    .sort()
    .join(",");
  const refresh = useEffectEvent(() => {
    void Promise.allSettled(
      [...presentations].map(([environmentId, presentation]) => {
        if (presentation.connection.phase !== "connected" || presentation.serverConfig === null)
          return;
        return refreshUsageLimits(
          environmentId,
          () => refreshProviders({ environmentId, input: {} }),
          true,
        );
      }),
    );
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- refreshes server limits on opening and when connected environments change
  useEffect(() => {
    if (connectedEnvironments) refresh();
  }, [connectedEnvironments]);

  return (
    <UsageLimitsSection
      selectedEnvironmentIds={null}
      hiddenProviders={NO_HIDDEN_PROVIDERS}
      now={now}
    />
  );
}

export function ThreadDashboard() {
  const { setOpenMobile } = useSidebar();
  const manualOpen = useAtomValue(dashboardOpenAtom);
  const threads = useQuietThreadShells();
  const liveEnvironments = useAtomValue(liveShellEnvironmentIdsAtom);
  const nowMinute = useNowMinute();
  const wakeClock = useSnoozeWakeClock(threads);
  const now = Math.max(Date.parse(`${nowMinute}:00.000Z`), wakeClock);
  const rows = dashboardThreads(threads, liveEnvironments, new Date(now).toISOString());
  const [autoOpen, setAutoOpen] = useLocalStorage(
    "t3code:dashboard:auto-open",
    false,
    Schema.Boolean,
  );
  const eligible = autoOpen && allDashboardThreadsBusy(rows);
  const [autoState, setAutoState] = useState({ eligible: false, open: false });
  const nextAutoState = dashboardAutoState(autoState, eligible);
  if (nextAutoState !== autoState) setAutoState(nextAutoState);
  const open = manualOpen || nextAutoState.open;
  const close = () => {
    appAtomRegistry.set(dashboardOpenAtom, false);
    setAutoState({ eligible, open: false });
  };
  const closeForNavigation = () => {
    close();
    setOpenMobile(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Dashboard</DialogTitle>
          <DialogDescription>
            Open threads and subscription limits across your environments.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex items-start justify-between gap-4">
            <label htmlFor="dashboard-auto-open" className="text-sm">
              Open automatically
              <span className="mt-1 block text-xs text-muted-foreground">
                When every open thread is working or snoozed. Saved on this device.
              </span>
            </label>
            <Switch id="dashboard-auto-open" checked={autoOpen} onCheckedChange={setAutoOpen} />
          </div>
          <section aria-label="Open threads" className="space-y-2">
            <h2 className="text-sm font-medium">Open threads ({rows.length})</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open threads. Start a thread to see its status here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map(({ thread, status }) => (
                  <li key={`${thread.environmentId}:${thread.id}`}>
                    <Link
                      to="/$environmentId/$threadId"
                      params={{ environmentId: thread.environmentId, threadId: thread.id }}
                      onClick={closeForNavigation}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-md py-2 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="min-w-0 truncate">{thread.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {open ? (
            <section aria-label="Subscription limits" className="space-y-2">
              <h2 className="text-sm font-medium">Subscription limits</h2>
              <DashboardLimits now={now} />
              <Link
                to="/usage"
                onClick={closeForNavigation}
                className="text-sm underline underline-offset-4"
              >
                View all usage
              </Link>
            </section>
          ) : null}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
