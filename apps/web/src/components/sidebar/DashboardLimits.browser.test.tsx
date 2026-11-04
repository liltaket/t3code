import "../../index.css";
import { ProviderDriverKind } from "@t3tools/contracts";
import type { LimitPool } from "@t3tools/shared/usageLimits";
import { expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { DashboardLimits } from "./DashboardLimits";

const pools: ReadonlyArray<LimitPool> = [
  {
    driver: ProviderDriverKind.make("codex"),
    accounts: [],
    windows: ["Session", "Weekly", "Extra A", "Extra B"].map((label) => ({
      id: label.toLowerCase(),
      kind: label === "Weekly" ? "weekly" : "session",
      label,
      members: [],
      columns: [],
      remainingPercent: 84,
      usedPercent: 16,
      pace: null,
      resets: [],
    })),
  },
];

it("keeps chosen windows across remounts, supports hiding all and restores suggestions", async () => {
  const key = "t3code:dashboard:limit-selection";
  const previous = localStorage.getItem(key);
  using _storage = {
    [Symbol.dispose]() {
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
    },
  };
  localStorage.removeItem(key);
  await using screen = await render(<DashboardLimits pools={pools} />);
  await expect
    .element(screen.getByRole("meter", { name: "Codex · Session remaining" }))
    .toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Choose limits" }));
  await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Codex · Session" }));
  await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Codex · Weekly" }));
  await userEvent.keyboard("{Escape}");
  await expect
    .element(screen.getByRole("meter", { name: "Codex · Weekly remaining" }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("meter", { name: "Codex · Session remaining" }))
    .not.toBeInTheDocument();
  await screen.unmount();
  await using restored = await render(<DashboardLimits pools={pools} />);
  await expect
    .element(restored.getByRole("meter", { name: "Codex · Weekly remaining" }))
    .toBeVisible();
  await userEvent.click(restored.getByRole("button", { name: "Choose limits" }));
  await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Codex · Extra A" }));
  await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Codex · Extra B" }));
  await expect
    .element(page.getByRole("menuitemcheckbox", { name: "Codex · Session" }))
    .toBeDisabled();
  await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Codex · Extra A" }));
  await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Codex · Extra B" }));
  await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Codex · Weekly" }));
  await userEvent.keyboard("{Escape}");
  await expect.element(restored.getByText("No limits selected")).toBeVisible();
  await userEvent.click(restored.getByRole("button", { name: "Choose limits" }));
  await userEvent.click(page.getByRole("menuitem", { name: "Use suggested limits" }));
  await expect
    .element(restored.getByRole("meter", { name: "Codex · Session remaining" }))
    .toBeVisible();
});
