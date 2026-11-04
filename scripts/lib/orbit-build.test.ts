import { describe, expect, it } from "vite-plus/test";
import { resolveOrbitPublicConfig } from "./orbit-build.ts";

const defaults = {
  T3CODE_CLERK_PUBLISHABLE_KEY: `pk_live_${btoa("clerk.example.com$")}`,
  T3CODE_CLERK_JWT_TEMPLATE: "t3-relay",
  T3CODE_CLERK_CLI_OAUTH_CLIENT_ID: "public-client",
  T3CODE_RELAY_URL: "https://relay.example.com",
  CLERK_SECRET_KEY: "must-not-be-copied",
};

describe("Orbit public build configuration", () => {
  it("fills public defaults, preserves operator configuration, and excludes secrets", () => {
    expect(
      resolveOrbitPublicConfig({ T3CODE_CLERK_JWT_TEMPLATE: "custom-template" }, defaults),
    ).toEqual({
      T3CODE_CLERK_PUBLISHABLE_KEY: defaults.T3CODE_CLERK_PUBLISHABLE_KEY,
      T3CODE_CLERK_JWT_TEMPLATE: "custom-template",
      T3CODE_CLERK_CLI_OAUTH_CLIENT_ID: "public-client",
      T3CODE_RELAY_URL: "https://relay.example.com",
    });
    expect(() => resolveOrbitPublicConfig({}, {})).toThrow("T3CODE_CLERK_PUBLISHABLE_KEY");
    expect(() =>
      resolveOrbitPublicConfig({ T3CODE_RELAY_URL: "http://relay.example.com" }, defaults),
    ).toThrow("secure relay URL");
    expect(() =>
      resolveOrbitPublicConfig(
        { T3CODE_RELAY_URL: "https://user:secret@relay.example.com" },
        defaults,
      ),
    ).toThrow("secure relay URL");
  });
});
