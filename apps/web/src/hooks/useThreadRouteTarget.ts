import type { ScopedThreadRef } from "@t3tools/contracts";
import { useLocation, useParams } from "@tanstack/react-router";

import {
  resolveThreadRouteRef,
  resolveThreadRouteTarget,
  type ThreadRouteTarget,
} from "../threadRoutes";

function useThreadRouteIds() {
  const environmentId = useParams({ strict: false, select: (params) => params.environmentId });
  const threadId = useParams({ strict: false, select: (params) => params.threadId });
  return { environmentId, threadId };
}

export function useThreadRouteTarget(): ThreadRouteTarget | null {
  const { environmentId, threadId } = useThreadRouteIds();
  const draftId = useParams({ strict: false, select: (params) => params.draftId });
  const dashboardDraftId = useLocation({
    select: (location) =>
      location.pathname === "/dashboard" && typeof location.search.draftId === "string"
        ? location.search.draftId
        : undefined,
  });
  return resolveThreadRouteTarget({
    environmentId,
    threadId,
    draftId: draftId ?? dashboardDraftId,
  });
}

export function useThreadRouteRef(): ScopedThreadRef | null {
  return resolveThreadRouteRef(useThreadRouteIds());
}
