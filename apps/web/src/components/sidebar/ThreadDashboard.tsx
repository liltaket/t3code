import { useAtomValue } from "@effect/atom-react";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { isListedThreadLineage, type EnvironmentId } from "@t3tools/contracts";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { openCommandPalette } from "../../commandPaletteBus";
import { useComposerDraftStore, type DraftId } from "../../composerDraftStore";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { useNowMinute } from "../../hooks/useNowMinute";
import {
  useProjects,
  useQuietThreadShells,
  useAllEnvironmentShellsBootstrapped,
} from "../../state/entities";
import { liveShellEnvironmentIdsAtom } from "../../state/shell";
import { isElectron } from "../../env";
import { workspaceAreaProps } from "../../lib/workspaceFocus";
import { sortScopedProjectsForSidebar, useSnoozeWakeClock } from "../Sidebar.logic";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { WorkspacePageContainer } from "../WorkspacePageContainer";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { SidebarInset } from "../ui/sidebar";
import { dashboardThreads } from "./dashboardState";
import { useDashboardDraftId } from "./dashboardPreferences";
import { DashboardUsage } from "./DashboardUsage";
import { DashboardStatistics } from "./DashboardStatistics";
import { useNavigateToMainApp } from "./mainAppLocation";

export function DashboardHeader() {
  const goBack = useNavigateToMainApp();
  return (
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
  );
}

export function DashboardOverview() {
  const threads = useQuietThreadShells();
  const ready = useAllEnvironmentShellsBootstrapped();
  const live = useAtomValue(liveShellEnvironmentIdsAtom);
  const minute = useNowMinute();
  const wakeClock = useSnoozeWakeClock(threads);
  const now = Math.max(Date.parse(`${minute}:00.000Z`), wakeClock);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<EnvironmentId | null>(null);
  const scopedThreads =
    selectedEnvironmentId === null
      ? threads
      : threads.filter((thread) => thread.environmentId === selectedEnvironmentId);
  const rows = dashboardThreads(scopedThreads, live, new Date(now).toISOString());
  const working = rows.filter((r) => r.status === "Working").length;
  const attention = rows.filter(
    (r) =>
      r.status === "Needs attention" &&
      (r.thread.hasPendingApprovals || r.thread.hasPendingUserInput),
  ).length;
  const idle = rows.filter(
    (r) =>
      r.status === "Needs attention" &&
      !r.thread.hasPendingApprovals &&
      !r.thread.hasPendingUserInput,
  ).length;
  const snoozed = rows.filter((r) => r.status === "Snoozed").length;
  const disconnected = rows.filter((r) => r.status === "Disconnected").length;
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startedToday = scopedThreads.filter(
    (thread) =>
      thread.deletedAt === null &&
      isListedThreadLineage(thread.lineage) &&
      Date.parse(thread.createdAt) >= startOfDay.getTime(),
  ).length;

  return (
    <div className="chat-composer-lane flex min-h-0 flex-1 flex-col">
      <ScrollArea>
        <WorkspacePageContainer className="max-w-(--chat-content-max-width) gap-7 px-0 pb-4 sm:px-0">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Your workspace</h1>
            {ready ? (
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                <span
                  aria-label={`${startedToday} threads started today in loaded workspace history`}
                >
                  {startedToday} threads today
                </span>
                <span>{working} working</span>
                <span className={attention > 0 ? "text-warning" : undefined}>
                  {attention} waiting on you
                </span>
                <span>{snoozed} snoozed</span>
                {idle > 0 ? <span>{idle} idle</span> : null}
                {disconnected > 0 ? <span>{disconnected} disconnected</span> : null}
              </p>
            ) : (
              <p role="status" className="mt-3 text-sm text-muted-foreground">
                Connecting to your environments…
              </p>
            )}
          </div>
          <DashboardStatistics
            now={now}
            selectedEnvironmentId={selectedEnvironmentId}
            onSelectedEnvironmentIdChange={setSelectedEnvironmentId}
          />
          <DashboardUsage now={now} selectedEnvironmentId={selectedEnvironmentId} />
          <footer className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
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
    </div>
  );
}

export function ThreadDashboard() {
  const projects = useProjects();
  const threads = useQuietThreadShells();
  const ready = useAllEnvironmentShellsBootstrapped();
  const openDraft = useNewThreadHandler();
  const router = useRouter();
  const [savedDraftId] = useDashboardDraftId();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef<number | null>(null);
  const project =
    sortScopedProjectsForSidebar(
      projects.filter((p) => p.archivedAt == null),
      threads,
      "updated_at",
    )[0] ?? null;
  const stillOnDashboard = useEffectEvent(() => router.state.location.pathname === "/dashboard");

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- opens a local composer draft on the dashboard without starting a server thread
  useEffect(() => {
    if (failed || pending.current === attempt || !stillOnDashboard()) return;
    const saved = savedDraftId
      ? useComposerDraftStore.getState().getDraftSession(savedDraftId as DraftId)
      : null;
    const restoreSaved =
      saved &&
      !saved.promotedTo &&
      (!ready ||
        projects.some(
          (p) =>
            p.id === saved.projectId &&
            p.environmentId === saved.environmentId &&
            p.archivedAt == null,
        ));
    if (!restoreSaved && (!ready || !project)) return;
    pending.current = attempt;
    const open = restoreSaved
      ? router.navigate({ to: "/dashboard", search: { draftId: savedDraftId! }, replace: true })
      : openDraft(scopeProjectRef(project!.environmentId, project!.id), {
          dashboard: true,
          replace: true,
        });
    void open
      .then((result) => {
        if (result === null) {
          pending.current = null;
          if (stillOnDashboard()) setAttempt((value) => value + 1);
        }
      })
      .catch(() => {
        pending.current = null;
        setFailed(true);
      });
  }, [attempt, failed, openDraft, project, projects, ready, router, savedDraftId]);

  return (
    <SidebarInset
      {...workspaceAreaProps("dashboard", 1, "Dashboard")}
      role="main"
      className="h-dvh min-h-0 overflow-hidden overscroll-y-none"
    >
      <DashboardHeader />
      <DashboardOverview />
      {ready && !project ? (
        <div className="px-5 py-6 text-center">
          <Button variant="outline" onClick={() => openCommandPalette({ open: "add-project" })}>
            Add a project to write a prompt
          </Button>
        </div>
      ) : failed ? (
        <div role="alert" className="px-5 py-4 text-sm">
          Couldn’t open the composer.{" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </SidebarInset>
  );
}
