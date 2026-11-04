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
  const suggested = pools.slice(0, 2).flatMap((pool) => {
    const first = displayLimitWindows(pool)[0];
    return first ? [`${pool.driver}:${first.id}`] : [];
  });
  const availableKeys = new Set(available.map((item) => item.key));
  const selectedKeys = (selection ?? suggested).filter((key) => availableKeys.has(key)).slice(0, 3);
  const visible = available.filter((item) => selectedKeys.includes(item.key));
  return (
    <section aria-label="Usage limits" className="orbit-dashboard-limits">
      <div className="orbit-dashboard-limits-picker">
        <Menu>
          <MenuTrigger
            aria-label="Choose limits"
            render={<Button variant="ghost-muted" size="icon-sm" />}
          >
            <SlidersHorizontalIcon />
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
                  disabled={!selectedKeys.includes(item.key) && selectedKeys.length >= 3}
                  onCheckedChange={(checked) => {
                    setSelection((previous) => {
                      const current = (previous ?? suggested)
                        .filter((key) => availableKeys.has(key))
                        .slice(0, 3);
                      return checked
                        ? [...new Set([...current, item.key])].slice(0, 3)
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
        <p className="pt-1 text-xs text-muted-foreground">
          {available.length === 0 ? "Limits unavailable" : "No limits selected"}
        </p>
      ) : (
        <ul className="grid gap-4">
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
                className="h-px overflow-hidden rounded-full bg-muted"
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
