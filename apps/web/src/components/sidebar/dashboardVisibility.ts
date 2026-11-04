import { Atom } from "effect/reactivity";
import { appAtomRegistry } from "../../rpc/atomRegistry";

export const dashboardOpenAtom = Atom.make(false).pipe(Atom.keepAlive);

export function openDashboard() {
  appAtomRegistry.set(dashboardOpenAtom, true);
}
