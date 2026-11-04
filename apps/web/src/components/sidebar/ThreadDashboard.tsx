import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { isListedThreadLineage } from "@t3tools/contracts";
import { useRouter } from "@tanstack/react-router";
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
import { isElectron } from "../../env";
import { workspaceAreaProps } from "../../lib/workspaceFocus";
import { sortScopedProjectsForSidebar } from "../Sidebar.logic";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { Button } from "../ui/button";
import { SidebarInset } from "../ui/sidebar";
import { useDashboardDraftId } from "./dashboardPreferences";
import { DashboardAurora } from "./DashboardAurora";
import { DashboardStatistics } from "./DashboardStatistics";
import { useNavigateToMainApp } from "./mainAppLocation";

export function DashboardHeader() {
  const goBack = useNavigateToMainApp();
  return (
    <WorkspacePageHeader electron={isElectron} className="relative z-10">
      <Button variant="ghost" size="icon" aria-label="Back to conversation" onClick={goBack}>
        <ArrowLeftIcon />
      </Button>
      <span className="text-sm font-medium">Dashboard</span>
    </WorkspacePageHeader>
  );
}

export function DashboardOverview() {
  const threads = useQuietThreadShells();
  const ready = useAllEnvironmentShellsBootstrapped();
  const minute = useNowMinute();
  const now = Date.parse(`${minute}:00.000Z`);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const startedToday = threads.filter(
    (thread) =>
      thread.deletedAt === null &&
      isListedThreadLineage(thread.lineage) &&
      Date.parse(thread.createdAt) >= startOfDay.getTime() &&
      Date.parse(thread.createdAt) < endOfDay.getTime(),
  ).length;
  return <DashboardStatistics now={now} startedToday={ready ? startedToday : null} />;
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
      className="relative h-dvh min-h-0 overflow-hidden overscroll-y-none"
    >
      <DashboardAurora />
      <DashboardHeader />
      <div data-orbit-dashboard-canvas="true" className="relative z-10 min-h-0 flex-1">
        <DashboardOverview />
        {ready && !project ? (
          <div className="orbit-dashboard-empty text-center">
            <Button variant="outline" onClick={() => openCommandPalette({ open: "add-project" })}>
              Add a project to write a prompt
            </Button>
          </div>
        ) : failed ? (
          <div role="alert" className="orbit-dashboard-empty text-sm">
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
        ) : (
          <div className="orbit-dashboard-empty text-sm text-muted-foreground" role="status">
            Opening composer…
          </div>
        )}
      </div>
    </SidebarInset>
  );
}
