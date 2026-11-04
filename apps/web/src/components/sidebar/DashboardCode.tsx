import { Link } from "@tanstack/react-router";
import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import type { Project, Thread } from "../../types";
import { useEnvironment } from "../../state/environments";
import { useEnvironmentQuery } from "../../state/query";
import { dashboardIssues } from "../../state/dashboardIssues";
import { usePullRequestList } from "../../state/pullRequests";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import { usePullRequestScope } from "../pullRequest/usePullRequestListView";
import { assignProjectsToEnvironments } from "../pullRequest/pullRequestProjectAssignment.logic";
import { Button } from "../ui/button";

function ProjectIssues({ project }: { project: Project }) {
  const environment = useEnvironment(project.environmentId);
  const connected = environment?.connection.phase === "connected";
  const query = useEnvironmentQuery(
    connected
      ? dashboardIssues({
          environmentId: project.environmentId,
          input: { projectId: project.id, limit: 4 },
        })
      : null,
  );
  useLiveRefresh(query.refresh, {
    enabled: connected,
    intervalMs: 60_000,
    key: `dashboard-issues:${project.environmentId}:${project.id}`,
  });
  return (
    <div className="min-w-0 border-t border-border py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="truncate text-xs font-medium text-muted-foreground">
          {query.data?.repository ?? project.title}
        </h3>
        {query.error ? (
          <Button
            variant="ghost-muted"
            size="icon-xs"
            aria-label={`Retry issues for ${project.title}`}
            onClick={query.refresh}
          >
            <RefreshCwIcon />
          </Button>
        ) : null}
      </div>
      {!connected ? (
        <p className="text-xs text-muted-foreground">Environment disconnected.</p>
      ) : query.error ? (
        <p role="status" className="text-xs text-warning">
          Could not load issues. Check source control or update this environment.
        </p>
      ) : query.data === null ? (
        <p role="status" className="text-xs text-muted-foreground">
          Loading issues…
        </p>
      ) : query.data.status === "unsupported" ? (
        <p className="text-xs text-muted-foreground">
          Issue listings are not supported by this source-control provider yet.
        </p>
      ) : query.data.entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {query.data.hasMore
            ? "No issues in the latest results. Open the tracker for more."
            : "No open issues."}
        </p>
      ) : (
        <ul className="space-y-2">
          {query.data.entries.map((issue) => (
            <li key={issue.number}>
              <a
                href={issue.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 gap-2 rounded-md py-0.5 text-sm outline-hidden hover:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="shrink-0 text-xs text-muted-foreground">#{issue.number}</span>
                <span className="min-w-0 flex-1 truncate">{issue.title}</span>
                <ExternalLinkIcon
                  aria-hidden
                  className="mt-0.5 size-3 shrink-0 text-muted-foreground"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
      {query.data?.url ? (
        <a
          href={query.data.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-xs text-muted-foreground underline underline-offset-4"
        >
          {query.data.hasMore ? "More open issues" : "Open issue tracker"}
        </a>
      ) : null}
    </div>
  );
}

export function DashboardCode({
  selectedProject,
  projects,
  threads,
}: {
  selectedProject: Project | null;
  projects: ReadonlyArray<Project>;
  threads: ReadonlyArray<Thread>;
}) {
  const [projectLimit, setProjectLimit] = useState(4);
  const scope = usePullRequestScope({
    state: "open",
    involvement: "all",
    ...(selectedProject
      ? { environmentId: selectedProject.environmentId, projectId: selectedProject.id }
      : {}),
  });
  const targets = scope.environmentQueries.map(({ environmentId, projectIds }) => ({
    environmentId,
    input: {
      state: "open" as const,
      involvement: "all" as const,
      limit: 12,
      ...(selectedProject ? { projectId: selectedProject.id } : {}),
      ...(projectIds ? { projectIds } : {}),
    },
  }));
  const prs = usePullRequestList(targets);
  useLiveRefresh(prs.refresh, {
    enabled: targets.length > 0,
    intervalMs: 60_000,
    key: `dashboard-prs:${scope.assignmentKey}`,
  });
  const entries = [
    ...new Map((prs.data?.entries ?? []).map((entry) => [entry.url, entry])).values(),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const assigned = assignProjectsToEnvironments(
    scope.projects,
    scope.queryEnvironmentIds,
    selectedProject?.environmentId,
  );
  const candidates = selectedProject
    ? [selectedProject]
    : projects
        .filter(
          (p) =>
            !p.isScratch &&
            p.repositoryIdentity !== null &&
            p.repositoryIdentity !== undefined &&
            assigned.get(p.environmentId)?.includes(p.id),
        )
        .sort((a, b) => {
          const score = (p: Project) =>
            threads.filter(
              (t) =>
                t.projectId === p.id &&
                t.environmentId === p.environmentId &&
                t.settledOverride !== "settled",
            ).length;
          return score(b) - score(a) || a.title.localeCompare(b.title);
        });
  return (
    <div className="grid min-w-0 gap-7 md:grid-cols-2">
      <section aria-labelledby="dashboard-prs-heading" className="min-w-0">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="dashboard-prs-heading" className="text-base font-semibold">
            Open pull requests
          </h2>
          <Link
            to="/pull-requests"
            search={{
              state: "open",
              involvement: "all",
              ...(selectedProject
                ? { environmentId: selectedProject.environmentId, projectId: selectedProject.id }
                : {}),
            }}
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            View all
          </Link>
        </div>
        {prs.error || prs.data?.errors.length ? (
          <p role="status" className="mb-3 text-xs text-warning">
            Some repositories could not be read. Check source control in Settings.
          </p>
        ) : null}
        {targets.length === 0 ? (
          <p className="border-t border-border py-4 text-sm text-muted-foreground">
            Connect a project with source control to see its pull requests.
          </p>
        ) : prs.data === null && prs.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading pull requests…
          </p>
        ) : entries.length === 0 ? (
          <p className="border-t border-border py-4 text-sm text-muted-foreground">
            {prs.error ? "Pull requests are unavailable." : "No open pull requests in this view."}
          </p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {entries.slice(0, 8).map((entry) => (
              <li key={entry.url}>
                <Link
                  to="/pull-requests"
                  search={{
                    state: "open",
                    involvement: "all",
                    environmentId: entry.environmentId,
                    projectId: entry.projectId,
                    repository: entry.repository,
                    number: entry.number,
                    host: entry.host,
                  }}
                  className="block min-w-0 rounded-lg py-3 outline-hidden hover:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="block truncate text-sm font-medium">{entry.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {entry.repository} #{entry.number}
                    </span>
                    <span>
                      {entry.isDraft
                        ? "Draft"
                        : entry.checksState === "failing"
                          ? "Checks failing"
                          : entry.reviewDecision === "approved"
                            ? "Approved"
                            : "Open"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {entries.length > 8 || prs.data?.truncated ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing recent pull requests. View all for the complete list.
          </p>
        ) : null}
      </section>
      <section aria-labelledby="dashboard-issues-heading" className="min-w-0">
        <h2 id="dashboard-issues-heading" className="mb-3 text-base font-semibold">
          Open issues
        </h2>
        {candidates.slice(0, projectLimit).map((project) => (
          <ProjectIssues key={`${project.environmentId}:${project.id}`} project={project} />
        ))}
        {candidates.length === 0 ? (
          <p className="border-t border-border py-4 text-sm text-muted-foreground">
            Choose a connected repository project to see open issues.
          </p>
        ) : null}
        {candidates.length > projectLimit ? (
          <div className="mt-3">
            <Button
              variant="ghost-muted"
              size="sm"
              onClick={() => setProjectLimit((limit) => limit + 4)}
            >
              Show more projects
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
