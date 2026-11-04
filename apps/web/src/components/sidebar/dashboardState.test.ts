import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import { makeThreadFixture } from "../../test-fixtures";
import { dashboardShouldOpen, dashboardThreads, allDashboardThreadsBusy } from "./dashboardState";

const now = "2026-11-04T12:00:00.000Z";
const environmentId = EnvironmentId.make("environment-test");
const live = new Set([environmentId]);

describe("dashboard thread status", () => {
  it("keeps attention, offline and expired snoozes out of the all-busy state", () => {
    const snoozed = makeThreadFixture({ snoozedUntil: "2026-11-04T13:00:00.000Z", runtime: null });
    const working = makeThreadFixture({
      runtime: {
        status: "running",
        activeRunId: null,
        providerInstanceId: ProviderInstanceId.make("codex"),
        providerName: "Codex",
        lastError: null,
        updatedAt: now,
      },
    });
    expect(dashboardThreads([working], live, now)[0]?.status).toBe("Working");
    expect(allDashboardThreadsBusy(dashboardThreads([working, snoozed], live, now))).toBe(true);
    const waiting = makeThreadFixture({ hasPendingApprovals: true });
    expect(allDashboardThreadsBusy(dashboardThreads([], live, now))).toBe(false);
    expect(dashboardThreads([snoozed], live, now)[0]?.status).toBe("Snoozed");
    expect(allDashboardThreadsBusy(dashboardThreads([snoozed], live, now))).toBe(true);
    expect(allDashboardThreadsBusy(dashboardThreads([snoozed, waiting], live, now))).toBe(false);
    expect(dashboardThreads([snoozed], new Set(), now)[0]?.status).toBe("Disconnected");
    expect(
      allDashboardThreadsBusy(dashboardThreads([snoozed], live, "2026-11-04T13:00:00.000Z")),
    ).toBe(false);
    expect(
      dashboardThreads([{ ...snoozed, hasPendingUserInput: true }], live, now)[0]?.status,
    ).toBe("Needs attention");
  });

  it("excludes archived, deleted, settled and delegated threads", () => {
    const thread = makeThreadFixture();
    expect(
      dashboardThreads(
        [
          { ...thread, archivedAt: now },
          { ...thread, deletedAt: now },
          { ...thread, settledOverride: "settled" },
          {
            ...thread,
            lineage: {
              rootThreadId: thread.id,
              parentThreadId: ThreadId.make("parent"),
              relationshipToParent: "subagent",
            },
          },
        ],
        live,
        now,
      ),
    ).toEqual([]);
  });
});

describe("dashboard automatic opening", () => {
  it("opens only on a new busy transition and leaves other views alone", () => {
    expect(dashboardShouldOpen(false, true, true)).toBe(true);
    expect(dashboardShouldOpen(true, true, true)).toBe(false);
    expect(dashboardShouldOpen(true, false, true)).toBe(false);
    expect(dashboardShouldOpen(false, false, true)).toBe(false);
    expect(dashboardShouldOpen(false, true, false)).toBe(false);
    expect(dashboardShouldOpen(true, true, false)).toBe(false);
  });
});
