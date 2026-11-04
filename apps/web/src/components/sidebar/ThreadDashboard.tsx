import { useAtomValue } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, FlaskConicalIcon, Plug2Icon } from "lucide-react";
import { useState } from "react";
import { useNowMinute } from "../../hooks/useNowMinute";
import {
  useProjects,
  useQuietThreadShells,
  useAllEnvironmentShellsBootstrapped,
} from "../../state/entities";
import { useEnvironments } from "../../state/environments";
import { liveShellEnvironmentIdsAtom } from "../../state/shell";
import { isElectron } from "../../env";
import { workspaceAreaProps } from "../../lib/workspaceFocus";
import { useSnoozeWakeClock } from "../Sidebar.logic";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { WorkspacePageContainer } from "../WorkspacePageContainer";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { SidebarInset } from "../ui/sidebar";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { dashboardThreads } from "./dashboardState";
import { DashboardActivity } from "./DashboardActivity";
import { DashboardUsage } from "./DashboardUsage";
import { DashboardCode } from "./DashboardCode";
import { useNavigateToMainApp } from "./mainAppLocation";

export function ThreadDashboard() {
  const threads = useQuietThreadShells();
  const projects = useProjects().filter((p) => p.archivedAt == null);
  const ready = useAllEnvironmentShellsBootstrapped();
  const { environments } = useEnvironments();
  const live = useAtomValue(liveShellEnvironmentIdsAtom);
  const minute = useNowMinute();
  const wakeClock = useSnoozeWakeClock(threads);
  const now = Math.max(Date.parse(`${minute}:00.000Z`), wakeClock);
  const [projectKey, setProjectKey] = useState("all");
  const selectedProject = projects.find((p) => `${p.environmentId}:${p.id}` === projectKey) ?? null;
  const scopedThreads =
    selectedProject === null
      ? threads
      : threads.filter(
          (t) =>
            t.environmentId === selectedProject.environmentId && t.projectId === selectedProject.id,
        );
  const rows = dashboardThreads(scopedThreads, live, new Date(now).toISOString());
  const labels = new Map(environments.map((e) => [e.environmentId, e.label]));
  const goBack = useNavigateToMainApp();
  const counts = [
    {
      label: "Working",
      count: rows.filter((r) => r.status === "Working").length,
      color: "text-info",
    },
    {
      label: "Needs attention",
      count: rows.filter((r) => r.status === "Needs attention" || r.status === "Disconnected")
        .length,
      color: "text-warning",
    },
    {
      label: "Snoozed",
      count: rows.filter((r) => r.status === "Snoozed").length,
      color: "text-muted-foreground",
    },
  ];
  const projectItems = [
    { value: "all", label: "All projects" },
    ...projects.map((p) => ({
      value: `${p.environmentId}:${p.id}`,
      label: `${p.title} · ${labels.get(p.environmentId) ?? "Environment"}`,
    })),
  ];

  return (
    <SidebarInset
      {...workspaceAreaProps("dashboard", 1, "Dashboard")}
      role="main"
      className="h-dvh min-h-0 overflow-hidden overscroll-y-none"
    >
      <WorkspacePageHeader electron={isElectron}>
        <Button variant="ghost" size="icon" aria-label="Back to conversation" onClick={goBack}>
          <ArrowLeftIcon />
        </Button>
        <span className="text-sm font-medium">Dashboard</span>
        <div className="ml-auto flex items-center gap-2 [-webkit-app-region:no-drag]">
          <Button variant="ghost-muted" size="sm" render={<Link to="/settings/labs" />}>
            <FlaskConicalIcon />
            Labs
          </Button>
        </div>
      </WorkspacePageHeader>
      <ScrollArea>
        <WorkspacePageContainer width="expanded">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Your workspace, at a glance</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Follow your agents, review work, and see what needs you next.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select
                items={projectItems}
                value={selectedProject === null ? "all" : projectKey}
                onValueChange={(value) => setProjectKey(value ?? "all")}
              >
                <SelectTrigger aria-label="Filter dashboard by project">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {projectItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-4 border-y border-border py-5">
            {counts.map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className={`mt-1 text-3xl font-semibold tabular-nums ${item.color}`}>
                  {ready ? item.count : "…"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
            <div className="min-w-0 space-y-8">
              {!ready ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Connecting to your environments…
                </p>
              ) : null}
              <DashboardActivity
                rows={rows}
                threads={scopedThreads}
                projects={projects}
                environmentLabels={labels}
              />
              <DashboardCode
                selectedProject={selectedProject}
                projects={projects}
                threads={scopedThreads}
              />
            </div>
            <aside className="min-w-0 space-y-8 xl:border-l xl:border-border xl:pl-7">
              <DashboardUsage now={now} environmentId={selectedProject?.environmentId ?? null} />
              <section
                aria-labelledby="dashboard-connections-heading"
                className="border-t border-border pt-6"
              >
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 id="dashboard-connections-heading" className="text-base font-semibold">
                    Connections
                  </h2>
                  <Link
                    to="/settings/connections"
                    className="text-xs text-muted-foreground underline underline-offset-4"
                  >
                    Manage
                  </Link>
                </div>
                <ul className="space-y-3">
                  {environments.map((e) => (
                    <li key={e.environmentId} className="flex min-w-0 items-center gap-2 text-sm">
                      <Plug2Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{e.label}</span>
                      <span
                        className={
                          e.connection.phase === "connected"
                            ? "text-xs text-success"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {e.connection.phase === "connected"
                          ? "Connected"
                          : e.connection.phase === "connecting"
                            ? "Connecting"
                            : "Disconnected"}
                      </span>
                    </li>
                  ))}
                </ul>
                {environments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Connect an environment to see its agents and usage.
                  </p>
                ) : null}
              </section>
            </aside>
          </div>
        </WorkspacePageContainer>
      </ScrollArea>
    </SidebarInset>
  );
}
