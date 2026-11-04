import { isListedThreadLineage, type EnvironmentId } from "@t3tools/contracts";
import { isThreadWorking } from "@t3tools/client-runtime/state/thread-inbox";
import { effectiveSnoozed } from "@t3tools/client-runtime/state/thread-settled";
import type { Thread } from "../../types";

export function dashboardThreads(
  threads: ReadonlyArray<Thread>,
  liveEnvironments: ReadonlySet<EnvironmentId>,
  now: string,
) {
  return threads
    .filter(
      (thread) =>
        thread.archivedAt === null &&
        thread.deletedAt === null &&
        thread.settledOverride !== "settled" &&
        isListedThreadLineage(thread.lineage),
    )
    .map((thread) => {
      const status = !liveEnvironments.has(thread.environmentId)
        ? "Disconnected"
        : effectiveSnoozed(thread, { now })
          ? "Snoozed"
          : isThreadWorking(thread)
            ? "Working"
            : "Needs attention";
      return { thread, status } as const;
    });
}

export function allDashboardThreadsBusy(rows: ReturnType<typeof dashboardThreads>) {
  return (
    rows.length > 0 && rows.every(({ status }) => status === "Working" || status === "Snoozed")
  );
}

export function dashboardAutoOpenTransition(
  shown: boolean,
  {
    eligible,
    canNavigate,
    isOnDashboard,
  }: { eligible: boolean; canNavigate: boolean; isOnDashboard: boolean },
) {
  const open = eligible && !shown && !isOnDashboard && canNavigate;
  return { shown: eligible && (shown || isOnDashboard || open), open };
}
