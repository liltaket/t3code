import { useAtomValue } from "@effect/atom-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useNowMinute } from "../../hooks/useNowMinute";
import { useThreadRouteTarget } from "../../hooks/useThreadRouteTarget";
import { useAllEnvironmentShellsBootstrapped, useQuietThreadShells } from "../../state/entities";
import { liveShellEnvironmentIdsAtom } from "../../state/shell";
import { useSnoozeWakeClock } from "../Sidebar.logic";
import { composerDraftHasUserContent, useComposerDraftStore } from "../../composerDraftStore";
import { useDashboardAutoOpen } from "./dashboardPreferences";
import { allDashboardThreadsBusy, dashboardShouldOpen, dashboardThreads } from "./dashboardState";

export function DashboardAutoOpen() {
  const [enabled] = useDashboardAutoOpen();
  const threads = useQuietThreadShells();
  const live = useAtomValue(liveShellEnvironmentIdsAtom);
  const ready = useAllEnvironmentShellsBootstrapped();
  const minute = useNowMinute();
  const wakeClock = useSnoozeWakeClock(threads);
  const now = new Date(Math.max(Date.parse(`${minute}:00.000Z`), wakeClock)).toISOString();
  const target = useThreadRouteTarget();
  const composerTarget = target?.kind === "server" ? target.threadRef : (target?.draftId ?? null);
  const hasUnsentDraft = useComposerDraftStore(
    (state) =>
      composerTarget !== null &&
      composerDraftHasUserContent(state.getComposerDraft(composerTarget)),
  );
  const canNavigate = target !== null && !hasUnsentDraft;
  const eligible =
    enabled && ready && allDashboardThreadsBusy(dashboardThreads(threads, live, now));
  const wasEligible = useRef(false);
  const navigate = useNavigate();

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- navigates the router once when all threads become busy, preserving drafts and utility pages
  useEffect(() => {
    const open = dashboardShouldOpen(wasEligible.current, eligible, canNavigate);
    wasEligible.current = eligible;
    if (open) void navigate({ to: "/dashboard" });
  }, [eligible, canNavigate, navigate]);
  return null;
}
