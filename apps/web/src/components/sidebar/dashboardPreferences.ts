import * as Schema from "effect/Schema";
import { useLocalStorage } from "../../hooks/useLocalStorage";

export function useDashboardAutoOpen() {
  return useLocalStorage("t3code:dashboard:auto-open", false, Schema.Boolean);
}
