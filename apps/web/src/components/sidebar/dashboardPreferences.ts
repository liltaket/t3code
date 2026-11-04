import * as Schema from "effect/Schema";
import { useLocalStorage } from "../../hooks/useLocalStorage";

export function useDashboardAutoOpen() {
  return useLocalStorage("t3code:dashboard:auto-open", false, Schema.Boolean);
}

const DashboardLimitSelectionSchema = Schema.NullOr(Schema.Array(Schema.String));

export function useDashboardLimitSelection() {
  return useLocalStorage("t3code:dashboard:limit-selection", null, DashboardLimitSelectionSchema);
}

const DashboardDraftIdSchema = Schema.NullOr(Schema.String);

export function useDashboardDraftId() {
  return useLocalStorage("t3code:dashboard:draft-id", null, DashboardDraftIdSchema);
}
