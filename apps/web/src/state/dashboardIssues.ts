import { WS_METHODS } from "@t3tools/contracts";
import { createEnvironmentRpcQueryAtomFamily } from "@t3tools/client-runtime/state/runtime";
import { connectionAtomRuntime } from "../connection/runtime";

export const dashboardIssues = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:dashboard:issues",
  tag: WS_METHODS.sourceControlListIssues,
  staleTimeMs: 60_000,
});
