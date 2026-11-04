import { createMemoryHistory } from "@tanstack/react-router";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import {
  ThreadId,
  UsageSummary,
  WS_METHODS,
  ORCHESTRATION_V2_WS_METHODS,
  OrchestrationV2ThreadLaunchError,
  type UsageSummaryInput,
  type OrchestrationV2ThreadLaunchInput,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import "~/index.css";

import { AppRoot } from "~/AppRoot";
// The route loads ChatView lazily, and its first transform (React Compiler over ~4k lines)
// takes 6-11s; importing it here keeps that out of the test's timeout.
import "~/components/ChatView";
import { DraftId, useComposerDraftStore } from "~/composerDraftStore";
import { setTheme, setAppearanceMode } from "~/hooks/useTheme";
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import { getRouter } from "~/router";
import {
  ENVIRONMENT_ID,
  PROJECT_ID,
  installFakeEnvironment,
  fakeDriver,
  type FakeDriver,
} from "../../../test/fakeEnvironment";
import { render } from "../../../test/render";

const decodeUsage = Schema.decodeUnknownSync(UsageSummary);

// The socket is the only fake layer; see test/appScenarios.renders.tsx.
vi.mock(
  "../../../../../packages/client-runtime/src/connection/driver.ts",
  async (importOriginal) => {
    const [actual, { fakeDriver }, Layer] = await Promise.all([
      importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
      import("../../../test/fakeEnvironment"),
      import("effect/Layer"),
    ]);
    return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
  },
);

vi.mock(import("~/rpc/requestLatencyState"), async (original) => ({
  ...(await original()),
  trackRpcRequestSent: () => {},
}));

it("keeps the dashboard draft through Labs and sends through the real composer with failure recovery", async () => {
  using _environment = installFakeEnvironment([]);

  const connect = fakeDriver.connect;
  const launch = vi.fn((input: OrchestrationV2ThreadLaunchInput) =>
    Effect.fail(
      new OrchestrationV2ThreadLaunchError({
        commandId: input.commandId,
        projectId: input.projectId,
        message: "Fixture launch rejected",
      }),
    ),
  );
  using _wire = vi.spyOn(fakeDriver, "connect").mockImplementation((entry) =>
    connect(entry).pipe(
      Effect.map((lease) => ({
        ...lease,
        session: {
          ...lease.session,
          client: new Proxy(lease.session.client, {
            get(target, method, receiver) {
              if (method === ORCHESTRATION_V2_WS_METHODS.launchThread) return launch;
              if (method === WS_METHODS.serverGetUsageSummary)
                return (input: UsageSummaryInput) =>
                  Effect.succeed(
                    decodeUsage({
                      contractVersion: 6,
                      readAt: "2026-11-04T15:00:00Z",
                      timeZone: input.timeZone,
                      sinceDay: input.sinceDay,
                      untilDay: input.untilDay,
                      buckets: [
                        {
                          day: input.untilDay,
                          ...(input.resolution === "hour"
                            ? {
                                hourStart: new Date(
                                  Date.parse(input.untilTime!) - 3_600_000,
                                ).toISOString(),
                              }
                            : {}),
                          provider: "codex",
                          model: "gpt-5.4",
                          totals: {
                            uncachedInputTokens: 20000,
                            cachedInputTokens: 100000,
                            cacheCreationTokens: 0,
                            outputTokens: 6000,
                            reasoningTokens: 0,
                          },
                          costUsd: 0,
                          cacheSavingsUsd: 0,
                          costSource: "unpriced",
                          records: 1,
                          unpricedRecords: 1,
                          sessions: 1,
                        },
                      ],
                      sources: [
                        {
                          fingerprint: {
                            provider: "codex",
                            hostId: "fixture",
                            resolvedHomePath: "/fixture",
                            volumeId: "fixture",
                          },
                          status: "ok",
                          scannedFiles: 1,
                          skippedFiles: 0,
                          malformedRecords: 0,
                          distinctSessions: 1,
                          message: null,
                        },
                      ],
                      pricing: {
                        status: "unavailable",
                        source: "fixture",
                        fetchedAt: null,
                        knownModels: 0,
                      },
                      scanDurationMs: 0,
                    }),
                  );
              return Reflect.get(target, method, receiver);
            },
          }),
        },
      })),
    ),
  );
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    environmentIdentificationMode: "nightly-artwork",
    onboardingCompletedAt: "2026-01-01T00:00:00Z",
  });
  setTheme("dark");
  setAppearanceMode("dark");
  localStorage.removeItem("t3code:dashboard:draft-id");
  const draftId = DraftId.make("draft-orbit-dashboard");
  const threadId = ThreadId.make("thread-orbit-dashboard");
  useComposerDraftStore
    .getState()
    .setProjectDraftThreadId(scopeProjectRef(ENVIRONMENT_ID, PROJECT_ID), draftId, {
      threadId,
      envMode: "local",
    });
  const router = getRouter(
    createMemoryHistory({ initialEntries: [`/dashboard?draftId=${draftId}`] }),
  );
  await router.load();
  await page.viewport(1280, 889);
  await using app = await render(<AppRoot router={router} />, {
    // AppRoot brings its own router.
    router: false,
  });
  await expect.element(page.getByTestId("composer-editor")).toBeVisible();
  await expect.element(page.getByRole("heading", { name: "Burn rate", exact: true })).toBeVisible();
  await expect.element(page.getByText("126K", { exact: true }).first()).toBeVisible();
  await userEvent.type(page.getByTestId("composer-editor"), "Keep this dashboard prompt");
  expect(launch).not.toHaveBeenCalled();
  await router.navigate({ to: "/settings/labs" });
  await router.navigate({ to: "/dashboard" });
  await expect
    .element(page.getByTestId("composer-editor"))
    .toHaveTextContent("Keep this dashboard prompt");
  expect(router.state.location.search.draftId).toBe(draftId);
  expect(launch).not.toHaveBeenCalled();
  await page.viewport(390, 844);
  await expect.element(page.getByTestId("composer-editor")).toBeVisible();
  expect(app.container.scrollWidth).toBeLessThanOrEqual(390);
  await page.viewport(1280, 889);
  await userEvent.click(page.getByTestId("composer-editor"));
  await userEvent.keyboard("{Enter}");
  await vi.waitFor(() => expect(launch).toHaveBeenCalledOnce());
  expect(launch.mock.calls[0]?.[0]).toMatchObject({
    projectId: PROJECT_ID,
    threadId,
    initialMessage: { text: "Keep this dashboard prompt" },
    modelSelection: { instanceId: "codex", model: "gpt-5.4" },
  });
  await expect.element(page.getByText("Fixture launch rejected").first()).toBeVisible();
  await expect
    .element(page.getByTestId("composer-editor"))
    .toHaveTextContent("Keep this dashboard prompt");
});
