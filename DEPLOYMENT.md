# Blast Radius deployment handoff

Live site: https://blast-radius-murex.vercel.app
Incident workspace: https://blast-radius-murex.vercel.app/app
Public repository: https://github.com/ronkenx9/blast-radius

The redesigned frontend and recipient migration were verified live on 18 October 2026 with Node 22, Vercel and the seeded FalkorDB Cloud free instance. The demo runs in deterministic mode without an AI key. See [the release record](submission/RELEASE.md) for the exact verified deployment and [the audit](submission/AUDIT.md) for scope and limitations.

## Local demo on this Mac

The extracted project is `~/Documents/vibecoding/blast-radius`. The database is a real FalkorDB, installed through the official FalkorDBLite package in `.falkordb/venv`. It listens only on `127.0.0.1:6389`; data is saved in `.falkordb/blast-radius.rdb`. The landing page runs on http://127.0.0.1:3100/ and the incident workspace on http://127.0.0.1:3100/app. An old incident link at `/?advisory=…` redirects to `/app?advisory=…`.

In each terminal, start with:

```sh
cd ~/Documents/vibecoding/blast-radius
export PATH="$PWD/.falkordb/runtime/node_modules/node/bin:$PATH"
```

This selects the project-local Node 22 installation, leaving the Mac's global Node unchanged. Standard Node 22 installed through your preferred version manager also works.

Terminal 1: `npm run falkordb:mac` (leave open). Terminal 2: `npm start -- --hostname 127.0.0.1 --port 3100` (leave open). For development, use `npm run dev -- --port 3100` instead. Run `npm run build` after changing code before using `npm start`.

For a new Mac setup: install Python 3.12+ and `libomp`, run `python3 -m venv .falkordb/venv`, then `.falkordb/venv/bin/pip install falkordblite==0.10.0`. Install Node 22, run `npm ci`, copy `.env.example` to `.env.local`, start the database, and run `npm run seed` once. Chromium for the browser test is installed with `npx playwright install chromium`.

**Seeding rebuilds the selected graph and deletes its investigation history.** Normal restarts do not need a seed. The seeded prior investigation is intentionally backdated demo history.

## FalkorDB Cloud

Create/select a dedicated demo graph database in FalkorDB Cloud. Copy its connection settings into local `.env.local` and into Vercel's server-side environment variables. Use either:

- `FALKORDB_URL`, with `redis://` or `rediss://` as supplied by the provider; or
- `FALKORDB_HOST`, `FALKORDB_PORT`, `FALKORDB_USERNAME`, `FALKORDB_PASSWORD`, and `FALKORDB_TLS=true` when TLS is required.

Set `FALKORDB_GRAPH=blast_radius`. Do not use the local `127.0.0.1` host or port 6389 in Vercel. Use the exact Cloud endpoint, port and TLS setting. Do not disable certificate verification.

With the dedicated Cloud database selected locally, run `npm run seed` once. The command now loads `.env.local` automatically. Shell-exported variables take precedence, and `FALKORDB_URL` takes precedence over separate host/port values. Restore the local settings afterwards if you want this Mac to keep using its own database. Do not seed automatically in the Vercel build or on every server restart.

## Vercel

1. Push the project to the intended GitHub repository, excluding `.env.local`, `.falkordb`, `node_modules`, `.next`, and `test-results`. Public repository: https://github.com/ronkenx9/blast-radius.
2. Import that repository into Vercel; select Next.js and Node **22.x**. The included `vercel.json` uses `npm ci` and `npm run build`.
3. Add the Cloud variables above to the intended environment (Production and/or Preview). For email, configure the server-side variables below, including `ADMIN_EMAIL`, before deploying. The API uses Node runtime TCP connections to FalkorDB; no Edge runtime or local database binary is deployed. Investigation and MCP routes allow 60 seconds.
4. Open `/api/health`: require `ok: true`, a populated graph, and the intended agent mode. Check the introduction at `/`, then test the featured incident, complete affected map, evidence path, key holders, light/dark canvas and memory at `/app`. Check that `/?advisory=GHSA-6rw7-vpxm-498p` still opens the correct incident. Run these checks against each new deployed release.
5. Visit protected `/setup` once after this release to confirm the server-configured recipient and remove the legacy recipient property from the graph. The live migration and authorized real test are recorded in [RELEASE.md](submission/RELEASE.md). The README links the accessible submitted overview video. `blog.md` is an unpublished draft.

For optional AI wording, configure exactly one of `AI_GATEWAY_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY`, and a compatible `LLM_MODEL` (plus `LLM_BASE_URL` for a custom compatible endpoint). No real model key was supplied to this session. No-key mode is fully functional. Local tests simulate rejected keys and malformed/ungrounded responses; they do not verify a real model provider.

`MCP_API_KEY` optionally requires a bearer token on POST `/api/mcp`. It does not protect the browser API. This is an intentionally public, synthetic-company demonstration with writeable investigation memory, not a private company deployment. Keep real company data out of this demo. A live model key enables model calls from the public investigation route; configure provider usage limits or deployment access controls for the intended audience.

## Admin email and scheduled monitoring

Configure these values as server-side deployment environment variables. Never prefix them with `NEXT_PUBLIC_` or put real values in the repository.

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL` | The approved real recipient. Stored outside the graph; changing the destination requires updating this environment variable and redeploying. |
| `ADMIN_TOKEN` | A secret of at least 32 characters for the owner-only `/setup` screen and admin API. |
| `MONITOR_TOKEN` | A separate secret protecting `/api/monitor`; use the same value in the GitHub Actions repository secret. |
| `APP_URL` | Canonical site origin, such as `https://blast-radius-murex.vercel.app`, without `/app`. |
| `RESEND_API_KEY` | A sending-only Resend key. |
| `ALERT_FROM` | Authorized sender, for example `Blast Radius <onboarding@resend.dev>` for own-account testing. Other recipients need a verified sending domain. |
| `RESEND_TEMPLATE_ID` | Optional published Resend template with string variables `DETAILS` and `MORE`. Long alerts fall back to complete plain text. |

At `/setup`, enter the admin key, confirm the read-only server-configured address and enable notifications. Only the enable/disable preference belongs in `AlertSettings`. Loading protected settings or monitor delivery removes a legacy `email` property from that node. Set `ADMIN_EMAIL` before this release; an address left only in the legacy graph property will no longer be used.

**Send test email** creates an explicitly marked synthetic incident alert, persists it and sends through the provider. It is a real send to the configured recipient. The application reports provider acceptance; verify receipt separately before claiming delivery. Replaying the same test request ID returns the existing accepted result, while a fresh button press is a new intentional test. Public incident simulations do not email.

For scheduled scans, set GitHub's `APP_URL` repository variable and `MONITOR_TOKEN` repository secret. `.github/workflows/monitor.yml` requests a scan every 30 minutes; scheduler delays are possible. The scan checks OSV against the seeded inventory, imports at most three advisory candidates and attempts one queued email. It does not detect attacks, import customer repositories or update the inventory after a patch. Existing advisory matches are the baseline.

The newest plain-English alert was tested once with the approved account's own inbox; Resend reported Delivered. See [RELEASE.md](submission/RELEASE.md) for the exact evidence and inbox-verification boundary. Keep screenshots of private setup, inboxes and provider accounts out of public demo media.

## Verification

With the local production server running:

```sh
npm run verify:build
npm run test:integration
npm run test:e2e
npm audit --omit=dev
```

Integration checks exercise every MCP tool, service paths against actual graph edges, owners/on-call, saved findings, supersession, prior memory, unknown advisories, malformed MCP input, optional MCP authorization, and AI fallback. Browser checks render the 3D canvas, run the incident, open Cypher and evidence, view key holders, and recall memory before and after a reload. Screenshots go to ignored `test-results/`.

Tests add investigations to the selected database. Use a dedicated demo/test graph. The data/cache directory contains public npm/OSV snapshots; these vulnerable versions are graph data, not installed application dependencies. The application uses a patched PostCSS override. The production dependency audit is separate from development-tool dependency findings.

## Docker alternative

`docker compose up --build` starts the services, then `docker compose exec app npm run seed` initializes the graph once. The database uses a named volume; app restarts preserve memory. Docker was not installed on this Mac, so this alternate path has not been executed here.

## References

- [Official FalkorDBLite installation and macOS requirements](https://github.com/FalkorDB/falkordblite)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

## Cloud instance for this demo

The dedicated instance is `blast-radius` (`instance-acnkqjr3c`), FalkorDB Free in AWS `us-east-1`. The user explicitly approved the free, non-TLS connection for this synthetic demo on 18 October 2026. Vercel Production and Preview use server-side FALKORDB_HOST, PORT, USERNAME, PASSWORD, GRAPH and TLS variables; the password is stored as a Secret. The Mac retains its separate local database settings. Do not place real company information in this demo or reuse its database password elsewhere.
