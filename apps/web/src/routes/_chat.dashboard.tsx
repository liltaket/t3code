import { createFileRoute } from "@tanstack/react-router";
import { ThreadDashboard } from "../components/sidebar/ThreadDashboard";

export const Route = createFileRoute("/_chat/dashboard")({
  validateSearch: (search: Record<string, unknown>): { draftId?: string | undefined } => ({
    draftId: typeof search.draftId === "string" ? search.draftId : undefined,
  }),
  component: ThreadDashboard,
});
