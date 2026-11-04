import { useAtomValue } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
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
import { dashboardThreads } from "./dashboardState";
import { DashboardActivity } from "./DashboardActivity";
import { DashboardUsage } from "./DashboardUsage";
import { useNavigateToMainApp } from "./mainAppLocation";

export function ThreadDashboard() {
  const threads = useQuietThreadShells();
  const projects = useProjects();
  const ready = useAllEnvironmentShellsBootstrapped();
  const { environments } = useEnvironments();
  const live = useAtomValue(liveShellEnvironmentIdsAtom);
  const minute = useNowMinute();
  const wakeClock = useSnoozeWakeClock(threads);
  const now = Math.max(Date.parse(`${minute}:00.000Z`), wakeClock);
  const rows = dashboardThreads(threads, live, new Date(now).toISOString());
  const labels = new Map(environments.map((e) => [e.environmentId, e.label]));
  const working = rows.filter((r) => r.status === "Working").length;
  const attention = rows.filter(
    (r) => r.status === "Needs attention" || r.status === "Disconnected",
  ).length;
  const snoozed = rows.filter((r) => r.status === "Snoozed").length;
  const goBack = useNavigateToMainApp();

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
        <div className="ml-auto [-webkit-app-region:no-drag]">
          <Button variant="ghost-muted" size="sm" render={<Link to="/settings/labs" />}>
            Labs
          </Button>
        </div>
      </WorkspacePageHeader>
      <ScrollArea>
        <WorkspacePageContainer>
          <div className="py-6 sm:py-10">
            <h1 className="text-xl font-medium tracking-tight">Your workspace</h1>
            {ready ? (
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span>{working} working</span>
                <span className={attention > 0 ? "text-warning" : undefined}>
                  {attention} need attention
                </span>
                <span>{snoozed} snoozed</span>
              </p>
            ) : (
              <p role="status" className="mt-3 text-sm text-muted-foreground">
                Connecting to your environments…
              </p>
            )}
          </div>
          <div className="space-y-10">
            <DashboardActivity
              rows={rows}
              threads={threads}
              projects={projects}
              environmentLabels={labels}
            />
            <DashboardUsage now={now} />
          </div>
          <footer className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link
              to="/settings/connections"
              className="rounded outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              Connections
            </Link>
            <Link
              to="/usage"
              className="rounded outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              All usage
            </Link>
          </footer>
        </WorkspacePageContainer>
      </ScrollArea>
    </SidebarInset>
  );
}
