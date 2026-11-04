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
      return { thread, status };
    });
}

export function allDashboardThreadsBusy(rows: ReturnType<typeof dashboardThreads>) {
  return (
    rows.length > 0 && rows.every(({ status }) => status === "Working" || status === "Snoozed")
  );
}

export function dashboardAutoState(
  previous: { eligible: boolean; open: boolean },
  eligible: boolean,
) {
  return previous.eligible === eligible ? previous : { eligible, open: previous.open || eligible };
}
