// @effect-diagnostics nodeBuiltinImport:off - Bootstrap supplies only public Connect defaults before invoking the existing artifact builder.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeUtil from "node:util";
import * as NodeChildProcess from "node:child_process";
import * as NodeURL from "node:url";
import { loadRepoEnv } from "./lib/public-config.ts";
import { resolveOrbitPublicConfig } from "./lib/orbit-build.ts";
import { resolveDesktopVariant } from "./lib/desktop-variant.ts";

const repoRoot = NodePath.resolve(NodeURL.fileURLToPath(import.meta.url), "../..");
const configured = loadRepoEnv({ repoRoot });
const publicConfig = resolveOrbitPublicConfig(
  configured,
  NodeUtil.parseEnv(NodeFS.readFileSync(NodePath.join(repoRoot, ".env.example"), "utf8")),
);
const args = process.argv.slice(2);
if (args.includes("--print-config")) {
  process.stdout.write(
    `${JSON.stringify({ variant: resolveDesktopVariant("orbit"), publicConfig }, null, 2)}\n`,
  );
} else {
  // oxlint-disable-next-line t3code/no-global-process-runtime -- This build bootstrap checks its host before spawning the Effect-based artifact builder.
  if (process.platform !== "darwin") throw new Error("Build T3 Orbit on the target Mac.");
  if (args.some((arg) => /^--skip-build(?:=|$)/u.test(arg)))
    throw new Error(
      "Orbit must rebuild its bundles with its own identity and public Connect configuration.",
    );
  const result = NodeChildProcess.spawnSync(
    process.execPath,
    [
      NodePath.join(repoRoot, "scripts/build-desktop-artifact.ts"),
      "--platform",
      "mac",
      "--target",
      "dmg",
      ...args,
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...configured,
        ...publicConfig,
        T3CODE_DESKTOP_VARIANT: "orbit",
        T3CODE_DESKTOP_SKIP_BUILD: "false",
        T3CODE_DISABLE_AUTO_UPDATE: "true",
      },
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
