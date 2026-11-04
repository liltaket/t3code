import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { isThreadWorking } from "@t3tools/client-runtime/state/thread-inbox";
import type { Project, Thread } from "../../types";
import { cn } from "../../lib/utils";
import { useEnvironmentProviders } from "../../state/environments";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { providerClients } from "../settings/providerDriverMeta";
import { Button } from "../ui/button";
import { dashboardThreads } from "./dashboardState";

const STATUS_COLOR = {
  Working: "bg-success/70",
  Snoozed: "bg-muted-foreground/50",
  "Needs attention": "bg-warning",
  Disconnected: "bg-destructive",
};

export function DashboardActivity({
  rows,
  threads,
  projects,
  environmentLabels,
}: {
  rows: ReturnType<typeof dashboardThreads>;
  threads: ReadonlyArray<Thread>;
  projects: ReadonlyArray<Project>;
  environmentLabels: ReadonlyMap<string, string>;
}) {
  const providers = useEnvironmentProviders();
  const [visibleCount, setVisibleCount] = useState(4);
  const order = { "Needs attention": 0, Disconnected: 1, Working: 2, Snoozed: 3 };
  const sorted = rows.toSorted(
    (a, b) =>
      order[a.status] - order[b.status] || b.thread.updatedAt.localeCompare(a.thread.updatedAt),
  );
  return (
    <section aria-labelledby="dashboard-activity-heading" className="min-w-0">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="dashboard-activity-heading" className="text-sm font-medium">
          Threads
        </h2>
        <span className="text-xs text-muted-foreground">{rows.length} open</span>
      </div>
      {rows.length === 0 ? (
        <p className="border-y border-border py-8 text-sm text-muted-foreground">
          No open threads in this view. Choose a thread in the sidebar or start a new one.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {sorted.slice(0, visibleCount).map(({ thread, status }) => {
            const project = projects.find(
              (p) => p.id === thread.projectId && p.environmentId === thread.environmentId,
            );
            const provider = providers
              .get(thread.environmentId)
              ?.find((p) => p.instanceId === thread.providerInstanceId);
            const children = threads.filter(
              (child) =>
                child.environmentId === thread.environmentId &&
                child.lineage.parentThreadId === thread.id &&
                child.lineage.relationshipToParent === "subagent" &&
                child.archivedAt === null &&
                child.deletedAt === null &&
                isThreadWorking(child),
            );
            const agentLabel =
              provider?.displayName ??
              (provider && providerClients.get(provider.driver)?.label) ??
              thread.runtime?.providerName ??
              String(thread.providerInstanceId);
            const preview = thread.runtime?.lastError;
            return (
              <li key={`${thread.environmentId}:${thread.id}`}>
                <Link
                  to="/$environmentId/$threadId"
                  params={{ environmentId: thread.environmentId, threadId: thread.id }}
                  className="group flex min-w-0 gap-3 rounded-lg py-4 outline-hidden hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                    {provider ? (
                      <ProviderInstanceIcon
                        driverKind={provider.driver}
                        displayName={agentLabel}
                        size="compact"
                      />
                    ) : (
                      <span className="text-xs font-medium">AI</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="min-w-0 truncate text-sm font-medium group-hover:text-primary">
                        {thread.title}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          aria-hidden
                          className={cn("size-1.5 rounded-full", STATUS_COLOR[status])}
                        />
                        {status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {project?.title ?? "Project"} ·{" "}
                      {environmentLabels.get(thread.environmentId) ?? "Environment"} · {agentLabel}
                    </p>
                    {preview ? (
                      <p className="mt-2 line-clamp-1 whitespace-pre-line text-sm text-muted-foreground">
                        {preview.slice(0, 280)}
                      </p>
                    ) : null}
                    {thread.blockedOnThreadWait ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Waiting for delegated work
                      </p>
                    ) : null}
                    {thread.hasPendingApprovals ||
                    thread.hasPendingUserInput ||
                    thread.pendingSubagentRequest ? (
                      <p className="mt-2 text-xs text-warning">Your response is needed</p>
                    ) : null}
                  </div>
                </Link>
                {children.length > 0 ? (
                  <ul
                    aria-label={`Subagents for ${thread.title}`}
                    className="mb-3 ml-11 space-y-1 border-l border-border pl-3"
                  >
                    {children.map((child) => (
                      <li key={child.id}>
                        <Link
                          to="/$environmentId/$threadId"
                          params={{ environmentId: child.environmentId, threadId: child.id }}
                          className="block truncate rounded-md py-1 text-xs text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          {child.title} · {child.modelSelection.model}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {sorted.length > visibleCount ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Showing {visibleCount} of {sorted.length} open threads
          </span>
          <Button
            variant="ghost-muted"
            size="sm"
            onClick={() => setVisibleCount((count) => count + 12)}
          >
            Show more threads
          </Button>
        </div>
      ) : null}
    </section>
  );
}
