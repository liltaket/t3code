import { displayLimitWindows, type LimitPool } from "@t3tools/shared/usageLimits";
import { SlidersHorizontalIcon } from "lucide-react";
import { providerClients } from "../settings/providerDriverMeta";
import { Button } from "../ui/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";
import { useDashboardLimitSelection } from "./dashboardPreferences";

export function DashboardLimits({ pools }: { pools: ReadonlyArray<LimitPool> }) {
  const [selection, setSelection] = useDashboardLimitSelection();
  const available = pools.flatMap((pool) =>
    displayLimitWindows(pool).map((window) => ({
      key: `${pool.driver}:${window.id}`,
      label: `${providerClients.get(pool.driver)?.label ?? String(pool.driver)} · ${window.label}`,
      accounts: pool.accounts.length,
      window,
    })),
  );
  const suggested = pools.slice(0, 3).flatMap((pool) => {
    const first = displayLimitWindows(pool)[0];
    return first ? [`${pool.driver}:${first.id}`] : [];
  });
  const selectedKeys = selection ?? suggested;
  const visible = available.filter((item) => selectedKeys.includes(item.key));
  return (
    <section aria-labelledby="dashboard-usage-heading" className="min-w-0">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="dashboard-usage-heading" className="text-sm font-medium">
          Your limits
        </h2>
        <Menu>
          <MenuTrigger render={<Button variant="ghost-muted" size="sm" />}>
            <SlidersHorizontalIcon />
            Choose limits
          </MenuTrigger>
          <MenuPopup align="end">
            {available.length === 0 ? (
              <MenuItem disabled>No limits available yet</MenuItem>
            ) : (
              available.map((item) => (
                <MenuCheckboxItem
                  key={item.key}
                  checked={selectedKeys.includes(item.key)}
                  closeOnClick={false}
                  onCheckedChange={(checked) => {
                    setSelection((previous) => {
                      const current = previous ?? suggested;
                      return checked
                        ? [...new Set([...current, item.key])]
                        : current.filter((key) => key !== item.key);
                    });
                  }}
                >
                  {item.label}
                </MenuCheckboxItem>
              ))
            )}
            <MenuSeparator />
            <MenuItem onClick={() => setSelection(null)}>Use suggested limits</MenuItem>
          </MenuPopup>
        </Menu>
      </div>
      {visible.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          {available.length === 0
            ? "Limits will appear when a connected account reports them."
            : "No limits selected. Choose the ones you want to keep here."}
        </p>
      ) : (
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {visible.map((item) => (
            <li key={item.key}>
              <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-muted-foreground">{item.label}</span>
                <span className="shrink-0 tabular-nums">{item.window.remainingPercent}% left</span>
              </div>
              <div
                role="meter"
                aria-label={`${item.label} remaining`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.window.remainingPercent}
                aria-valuetext={`${item.window.remainingPercent}% remaining across ${item.accounts} ${item.accounts === 1 ? "account" : "accounts"}`}
                className="h-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={
                    item.window.remainingPercent <= 10
                      ? "h-full rounded-full bg-warning/60"
                      : "h-full rounded-full bg-success/50"
                  }
                  style={{ width: `${item.window.remainingPercent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
