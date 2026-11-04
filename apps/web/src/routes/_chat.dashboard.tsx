import { createFileRoute } from "@tanstack/react-router";
import { ThreadDashboard } from "../components/sidebar/ThreadDashboard";

export const Route = createFileRoute("/_chat/dashboard")({ component: ThreadDashboard });
