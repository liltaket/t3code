import { resolveDesktopVariant } from "../../../../scripts/lib/desktop-variant.ts";

declare const __T3CODE_BUILD_VARIANT__: string | undefined;

export const desktopVariant = resolveDesktopVariant(
  typeof __T3CODE_BUILD_VARIANT__ === "undefined" ? "t3code" : __T3CODE_BUILD_VARIANT__,
);
