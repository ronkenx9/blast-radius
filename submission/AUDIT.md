# Blast Radius product audit

Audit date: 18 October 2026. Baseline: commit `6eda4db`, followed by the targeted fixes described below. Deployment checked: https://blast-radius-murex.vercel.app. This report covers the synthetic demo; it is not a penetration-test certification or a claim of production SaaS readiness.

## Verdict

The deployed graph-backed demo passed read-only functional checks. The local full investigation, memory, MCP, model-fallback and mock-email checks passed. An independent graph traversal confirmed all 135 seeded advisories, rather than only the featured example. Two source defects were corrected and their local regression checks passed. A subsequent requested email amendment was also implemented and checked locally. The release owner must still deploy those corrections, invoke protected settings once to remove the legacy recipient property, and complete final build and visual checks on the redesigned frontend.

No real email was sent, no production investigation was created, and production graph data was not changed during this audit. Previously verified real delivery is recorded in `EMAIL_GATES.md`; that historical verification was not represented as a new audit result.

## Evidence

| Check | Measured result |
|---|---|
| Existing local integration suite | `INTEGRATION_VERIFIED`: 1,522 display nodes; 2,955 edges; 5 exposed services; 3 tier-1; 11 deterministic claims; top maintainer reaches 8 services |
| Existing AI failure scenarios | Rejected key, malformed output and unknown version all fell back to deterministic text; saved investigation mode remained correct |
| Existing alert suite, extended for fixes | `ALERTS_VERIFIED`: authentication, impact paths, persistent deduplication, mocked acceptance/rejection, monitor import/repeat, recipient lock/removal and fixed-version format |
| Independent breadth-first traversal | All 135 advisories matched Cypher: 270 service/version exposure pairs; shortest paths matched; longest shortest path was 5 hops |
| Complete featured map | Independent edge computation matched all 9 dependency/deployment edges, including every connecting branch; combined map has 20 nodes and 21 edges with ownership/on-call/advisory links |
| Independent maintainer reach | Service sets and counts matched for the first 50 maintainers returned by the ranking query |
| Production graph and impact | 1,522 display nodes; 2,955 edges; zero dangling edges; featured impact 5 services / 3 tier-1 / 20 nodes / 21 edges |
| Production saved memory | A saved featured investigation was triaged; all returned brief findings had evidence links |
| Production public API restrictions | Anonymous admin GET, admin POST and monitor POST returned 401; missing impact returned 404; malformed MCP returned JSON-RPC -32600 |
| Production privacy surface | Public graph excluded Alert, AlertSettings and Monitor nodes; public alert response exposed neither recipient nor provider message ID |
| Production MCP | Read-only `blast_radius` call returned the same five services |
| Production mode | Health reported deterministic mode; no live-model claim is made |
| Dependency advisory check | `npm audit --omit=dev --json`: zero production findings (85 production dependencies counted by npm) |
| Source/history secret review | 7 commits, 108 blobs, 98 text blobs; no matches to local admin/monitor/OIDC secret values or common GitHub/Resend/model-key formats |

The five featured services are `auth-service`, `kyc-worker`, `payments-api`, `notifications` and `reporting`. They do not list `qs` directly. Graph paths were checked against actual edges rather than accepted solely from the returned brief.

The live monitor status observed during the audit was `2026-10-18T14:26:57.392Z` with an empty error. This proves the last recorded successful scan, not continuous uptime or guaranteed scheduling.

## Corrected findings

### Recipient data must stay outside the synthetic graph

**Problem:** the graph previously persisted the real notification destination as `AlertSettings.email`, which conflicts with the submission's synthetic-data boundary.

**Change:** the destination is now read only from server-side `ADMIN_EMAIL`. Protected setup confirms that destination and stores only the enable/disable preference in the graph. A request to change the destination through the public deployment's setup endpoint is rejected; the deployment owner changes the server setting. The API returns `recipientLocked: true` for the frontend.

The following idempotent migration runs within protected settings access and monitoring delivery:

```cypher
MATCH (s:AlertSettings {id:'admin'})
REMOVE s.email
RETURN s.enabled AS enabled
```

Set `ADMIN_EMAIL` before deploying. Then access protected settings once. This audit verified the migration locally with a synthetic legacy address; final production migration is a release-owner check. This is single-workspace owner setup, not multi-tenant onboarding.

### New advisory imports lost the package name for patched versions

**Problem:** the seed stored `package@version`, while the monitor stored a bare version. The brief expects `package@version`, so a newly imported advisory could incorrectly report that no patched release was listed.

**Change:** monitoring now preserves the npm package name for each fixed version, ignores other ecosystems and deduplicates the results. The regression fixture imports `qs@6.14.1` and confirms that format in the resulting impact data. The cached seeded advisories already used the correct format.

### Make the alert useful without reading a technical trace

The email now uses a short human-readable subject and a plain-language description of the featured memory-exhaustion issue. It provides three ordered actions: update the affected dependency using the graph-listed patched release, prioritize the critical services and contact their owners, then test/deploy/verify the resolved dependency. All five service/owner lines remain visible, while full graph paths are available through one map link. `qs@6.14.1` comes from the advisory data, not an invented recommendation; compatibility and indirect dependencies are called out. When no fixed version is listed, the email says so and asks for verified mitigation rather than inventing a version. The template explicitly notes that the sample inventory does not automatically update after a deployment.

New local assertions check the explanation, the graph-backed patched version, numbered actions, critical service/owner presence, indirect-dependency guidance, absence of raw graph-path dumps, a concise featured-message size, and the no-fix fallback. `ALERTS_VERIFIED` passed after this change. No fresh real email was sent during the amendment.

## Remaining limits and recommendations

1. **Public demo access permits investigation writes and compute use.** `/api/investigate` and the optional unauthenticated MCP `run_investigation` can persist synthetic memory. There is no application rate limit or per-user isolation. Keep synthetic data and deterministic mode for the public hackathon demo. Add authentication, quotas and retention before using customer data or an unrestricted model key. `MCP_API_KEY` protects MCP only, not every application endpoint.
2. **Optional model grounding is a partial guard.** It validates cited IDs and selected package/version/CVE-style tokens. It does not prove that every number, person name or semantic assertion follows from the evidence. The audited deployment is deterministic; do not advertise the optional guard as a proof system or a guarantee against hallucinations.
3. **Monitoring checks published vulnerability exposure in a seeded inventory.** It does not detect an intrusion, ingest a customer's repository, establish exploitability or automatically remediate. GitHub scheduling can be delayed. A scan imports at most three new advisories and attempts one pending/failed email.
4. **Delivery is not an exactly-once or inbox guarantee.** Durable accepted state, a lease and a stable provider idempotency key reduce duplicate sends. A database failure after provider acceptance and beyond the provider's idempotency retention window can still require reconciliation. A permanently failed oldest alert can delay later alerts under the current one-at-a-time retry policy. The app labels provider acceptance; it does not claim inbox arrival.
5. **The current sender is for the approved account's own inbox.** Sending to other admins requires a verified sending domain. Existing real inbox delivery evidence is historical and separate from this no-send audit.
6. **Traversal and hosting are sized for this demo.** Exposure searches are capped at 12 hops. All seeded shortest paths are at most 5 hops. Larger inventories and alternate routes need scale testing. The free Cloud connection is non-TLS by the owner's explicit choice; do not carry that assumption to a real-data deployment.
7. **Re-seeding deletes state.** The seed rebuilds the selected graph, including memory and alert preferences. It must not run automatically on deployment or restart. Docker is documented as an alternative but was not run in this Mac audit.
8. **Final frontend verification belongs to the release pass.** The root agent is changing the interface concurrently. This audit did not use the shared browser or certify the new layout, accessibility, animation, mobile behavior or video captures. Run the final build and interact with the deployed release before recording the demo.

## Public repository review

No application secret was found in the reviewed tracked history. The `.env.example` credential URL matches were placeholders. A token-shaped candidate in `data/cache/osv-vulns.json` was the access-key identifier inside an expired 2024 presigned URL quoted in public advisory `GHSA-f5x3-32g6-xq36`; it was not a current application credential. No credential values were printed by the scanner. The six pattern families were checked against synthetic positive controls before accepting negative results. Pattern scanning is not a guarantee that every possible secret format is recognized.

The recipient is not present in committed source. Real recipient migration described above still needs the final deployed settings read. Do not include private provider dashboards, inbox screenshots, access keys or account details in the published videos. This audit did not change repository visibility or publish code.

## Reproduce the existing checks

From the repository root, use Node 22 and the seeded local app/database. The native Mac runtime used here is Node 22.23.3. Do not point these write-capable integration tests at production.

```sh
export PATH="$PWD/.falkordb/runtime/node_modules/node/bin:$PATH"
BASE=http://127.0.0.1:3100 npm run test:integration
node --import tsx scripts/test-alerts.ts
npm audit --omit=dev --json
```

The integration command creates local synthetic investigations. The alert command asserts a local database, clears real email credentials before testing, mocks provider responses and restores the local enable/disable setting. The expected mock 429 log is a tested failure path, not a live provider failure.

The independent graph audit used the public graph's `DEPLOYS`/`DEPENDS_ON` adjacency lists and ordinary breadth-first search: reverse traversal from every affected version produced the expected service set and distance; those sets/distances were compared with all 135 `blast_radius` responses. It independently intersected service reachability and vulnerable-version ancestry to check the featured map's full edge set, and rolled package-version ancestors up through `MAINTAINS` to verify 50 maintainer reach sets. It did not reuse the application's Cypher traversal implementation.

The release owner should run `npm run verify:build` once frontend edits are complete. Do not treat the pre-release API checks as final evidence for a later changed deployment.

## Four-pass audit record

- **Complete:** inspected routes, query registry, agents, alerts, monitor, settings, deployment files and existing checks; exercised local and deployed surfaces within the no-send/no-production-write scope.
- **Depth:** independently reconstructed reachability/shortest paths and maintainer service sets; identified the fixed-version contract mismatch and recipient-data boundary.
- **Correctness and integration:** corrected both source findings, extended mock/local regression tests, reran them successfully, checked unauthorized access and history/dependency exposure.
- **Polish:** separated fresh evidence from prior delivery evidence, documented remaining limits and required final deployment/UI checks, and removed unsupported completion/security claims from this report.

## Release follow-up: frontend test maintenance and email handoff

The browser test source was updated for the redesigned interface: `Key holders`, capitalized `Reset`, the new key-holder heading, labelled report panels, and a canvas-size assertion relative to its actual container. `node --check scripts/test-e2e.mjs` passed. The browser suite itself was not run by this auditor; root owns the browser session and final visual verification. A read-only review of the release diff found no new functional blocker.

A separate workspace helper prepares a sanitized generated alert preview and, only with an explicit `--send-once` flag after deployment approval, performs a protected settings read followed by one real test request to the already-approved destination. The private receipt contains only the test ID and provider ID; an unfinished receipt prevents automatic retries after an unknown outcome. Preview mode reads public impact data only, prints no credentials or recipient, and does not authenticate or send mail. The generated preview is explicitly labelled as a preview, not delivery evidence.
