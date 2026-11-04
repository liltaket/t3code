import { clerkFrontendApiHostnameFromPublishableKey } from "@t3tools/shared/relayAuth";

const PUBLIC_KEYS = [
  "T3CODE_CLERK_PUBLISHABLE_KEY",
  "T3CODE_CLERK_JWT_TEMPLATE",
  "T3CODE_CLERK_CLI_OAUTH_CLIENT_ID",
  "T3CODE_RELAY_URL",
] as const;

export function resolveOrbitPublicConfig(
  configured: Readonly<Record<string, string | undefined>>,
  defaults: Readonly<Record<string, string | undefined>>,
) {
  const result = Object.fromEntries(
    PUBLIC_KEYS.map((key) => [key, configured[key]?.trim() || defaults[key]?.trim()]),
  );
  for (const key of PUBLIC_KEYS) {
    if (!result[key]) throw new Error(`Orbit requires ${key}.`);
  }
  clerkFrontendApiHostnameFromPublishableKey(result.T3CODE_CLERK_PUBLISHABLE_KEY!);
  const relay = new URL(result.T3CODE_RELAY_URL!);
  if (
    relay.protocol !== "https:" ||
    relay.username ||
    relay.password ||
    relay.search ||
    relay.hash
  ) {
    throw new Error("Orbit requires a secure relay URL without credentials or query parameters.");
  }
  return result;
}
