import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { assert, it } from "@effect/vitest";
import { vi } from "vite-plus/test";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as DesktopConfig from "./DesktopConfig.ts";
import * as DesktopEnvironment from "./DesktopEnvironment.ts";
import * as DesktopAppSettings from "../settings/DesktopAppSettings.ts";
import { resolveUserDataPath } from "./DesktopUserData.ts";
import * as DesktopLegacyLocalStorage from "./DesktopLegacyLocalStorage.ts";
import * as DesktopCliCommand from "./DesktopCliCommand.ts";

vi.mock("./DesktopVariant.ts", async () => {
  const { resolveDesktopVariant } = await import("../../../../scripts/lib/desktop-variant.ts");
  return { desktopVariant: resolveDesktopVariant("orbit") };
});

it.effect(
  "keeps Orbit client-only with its own state despite old settings and ambient T3 home",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const home = yield* fs.makeTempDirectoryScoped({ prefix: "orbit-isolation-" });
      const environmentLayer = DesktopEnvironment.layer({
        dirname: "/repo/apps/desktop/dist-electron",
        homeDirectory: home,
        platform: "darwin",
        processArch: "arm64",
        appVersion: "0.1.7",
        appPath: "/Applications/T3 Orbit.app/Contents/Resources/app.asar",
        isPackaged: true,
        resourcesPath: "/Applications/T3 Orbit.app/Contents/Resources",
        runningUnderArm64Translation: false,
      }).pipe(
        Layer.provide(
          DesktopConfig.layerTest({
            T3CODE_HOME: path.join(home, ".t3"),
            T3CODE_DISABLE_AUTO_UPDATE: "false",
          }),
        ),
      );
      yield* Effect.gen(function* () {
        const environment = yield* DesktopEnvironment.DesktopEnvironment;
        assert.equal(environment.stateDir, path.join(home, ".t3-orbit/userdata"));
        assert.equal(environment.branding.baseName, "T3 Orbit");
        const config = yield* DesktopConfig.DesktopConfig;
        assert.isTrue(config.disableAutoUpdate);
        const profile = yield* resolveUserDataPath(environment);
        assert.equal(profile, path.join(home, "Library/Application Support/t3-orbit"));
        yield* fs.makeDirectory(environment.stateDir, { recursive: true });
        yield* fs.writeFileString(
          environment.desktopSettingsPath,
          '{"localEnvironmentEnabled":true}',
        );
        const settings = yield* DesktopAppSettings.DesktopAppSettings;
        assert.isFalse((yield* settings.load).localEnvironmentEnabled);
        assert.isFalse(
          (yield* settings.setLocalEnvironmentEnabled(true)).settings.localEnvironmentEnabled,
        );
        const legacy = yield* DesktopLegacyLocalStorage.DesktopLegacyLocalStorage;
        yield* legacy.load(profile);
        assert.isTrue(Option.isNone(yield* legacy.take));
        const cli = yield* DesktopCliCommand.DesktopCliCommand;
        assert.isFalse((yield* cli.state).supported);
        assert.isTrue(yield* Effect.isFailure(cli.install));
        assert.isFalse(yield* fs.exists(path.join(home, ".t3")));
        assert.isFalse(yield* fs.exists(profile));
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            DesktopAppSettings.layer,
            DesktopLegacyLocalStorage.layer,
            DesktopCliCommand.layer,
          ).pipe(Layer.provideMerge(environmentLayer)),
        ),
      );
    }).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)), Effect.scoped),
);
