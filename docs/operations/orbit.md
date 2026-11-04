# T3 Orbit on macOS

T3 Orbit is the fork's desktop client variant. It serves the fork's bundled web client,
including the dashboard, and connects to existing environments. Their servers own
projects, threads, provider authentication, GitHub integration, and server preferences.
Orbit does not start a local T3 server or register a new Connect host. Keep the existing
Mac server running if Orbit uses it.

## Build

Use a clean checkout of `liltaket/t3code` at the intended revision and the Node/Vite+
versions required by the repository. Preserve unrelated local changes in older checkouts.

```sh
vp i
vp run dist:orbit --print-config
vp run dist:orbit --arch arm64 --output-dir release-orbit
```

Use `--arch x64` on Intel. Install `T3 Orbit.app` from the generated DMG beside the
official app. The wrapper rebuilds the bundles with `T3CODE_DESKTOP_VARIANT=orbit`;
reusing prebuilt bundles is rejected because they may carry the official identity.
Build output is unsigned by default. Signing requires the fork's own Apple identity,
provisioning profile and passkey association; do not reuse the official app's entitlements.

The wrapper fills only four public Connect values from `.env.example`: the Clerk
publishable key, JWT template, public CLI OAuth client ID and relay URL. Existing
process/`.env.local`/`.env` public configuration takes precedence. No `.env` file is
created and no provider or account credentials are copied. These values are embedded
in both the renderer and Electron main process; changing them requires a rebuild.

## Isolation and updates

| Resource                     | Orbit                                        |
| ---------------------------- | -------------------------------------------- |
| Bundle ID                    | `com.liltaket.t3orbit`                       |
| Packaged Electron profile    | `~/Library/Application Support/t3-orbit`     |
| Development Electron profile | `~/Library/Application Support/t3-orbit-dev` |
| Packaged client state        | `~/.t3-orbit/userdata`                       |
| Development client state     | `~/.t3-orbit/dev`                            |
| URL handlers                 | `t3code-orbit`, `t3code-orbit-dev`           |

Orbit ignores ambient `T3CODE_HOME`, never imports legacy T3 profiles, forces the
local environment off even in old settings, and does not install or remove the `t3`
CLI. Existing Orbit databases remain on disk but the client does not open them as a
server. The official app, its profiles, database and URL handlers stay separate.

App auto-updates and update feeds are disabled in this variant. Update by rebuilding
an explicitly selected fork revision and replacing only `T3 Orbit.app`. The existing
daily upstream-sync workflow still updates source, not installed binaries.

## Connect sign-in and pairing

Sign in again in Orbit to the same Connect account. Discovery uses existing environment
registrations; it does not call the host-link operation. Compare registered environment
IDs and host-slot counts before and after. Do not enable Connect on an old Orbit server
or register Orbit as a host. Never import an official profile's cookies, tokens, saved
connection credentials, DPoP keys or database to make sign-in appear to work.

Public configuration enables the sign-in UI but cannot authorize a new native origin.
The Connect operator may need to allow `t3code-orbit://app` (and the development origin)
in Clerk's `allowed_origins`, plus `t3code-orbit://app/` in its native SSO redirect
allowlist. See [Connect setup](connect-setup.md#desktop-oauth-redirects). No such
production configuration is changed by this build. Test sign-in, browser callback and
restart persistence on the Mac. Native passkeys also need an Apple association for
Orbit's bundle ID, so an unsigned local build must not be treated as passkey-verified.

If Connect sign-in is unavailable, use the existing app's ordinary pairing flow for
the existing Mac, Kuffe or Putte server. Pair Orbit as a fresh client. A one-time
pairing credential grants a new client session; it is not an import of old secrets.
Open the pairing URL through Orbit's Add connection UI or `t3code-orbit://pair`.
Do not publish pairing URLs in logs or handoffs. Hosted pages' default `t3code://`
links still belong to the official app; Orbit does not take them over.

## Compatibility and installation verification

| Feature                               | Dependency and required verification                                                                                                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard and Labs auto-open          | Fork's bundled client; check logo, Back, unsent drafts and project filter.                                                                                                                           |
| Activity, usage, connections          | Existing server shell/provider contracts; verify each connected machine.                                                                                                                             |
| Pull requests and GitHub              | Existing server's source-control authentication and RPCs. Test lists, selected PR, diff and returning to chat.                                                                                       |
| Dashboard issue list                  | Fork-only `sourceControl.listIssues` RPC. Older official servers show an unavailable notice and repository link; other dashboard sections remain usable. No host upgrade is performed automatically. |
| Codex and Claude                      | Run on the chosen environment using its own installed/authenticated runtime. Orbit needs no copied CLI credentials.                                                                                  |
| Gemini / Antigravity                  | Requires T3's Antigravity ACP runtime and authentication on the execution environment. The Antigravity app or `agy` alone is insufficient. Models come from that environment's current catalog.      |
| Files, terminals, preview and devices | Depend on the environment's permissions and compatible server capabilities. Verify a harmless operation through each needed surface.                                                                 |
| Native auth and links                 | Verify fresh Connect sign-in, correct Orbit callback ownership, provider return links and persistence after restart.                                                                                 |

On the target Mac, run the official app and Orbit together. Confirm distinct bundle
IDs and profile paths, no Orbit-owned local server listener or Connect host, and no
changes to the official database/profile. Existing providers can be inspected without
paid turns. Use Replay for general pipeline checks; run paid provider turns only when
needed to establish provider-specific compatibility and report them separately.

Copy only explicitly selected non-secret client preferences when migrating the old
Orbit setup: theme, keybindings and UI settings. Server/provider choices already come
from the connected environment. Preserve both the old Orbit data and the official app
until the new installation has passed verification. Uninstallation removes only
`T3 Orbit.app`; retain Orbit's private profile/state unless deletion is requested.
