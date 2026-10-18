# Gates: Blast Radius cloud deployment

OWNS: DEPLOY_GATES.md README.md DEPLOYMENT.md scripts/deploy-smoke.mjs

Scope: Provision FalkorDB Cloud, seed the dedicated demo graph, deploy to Vercel and verify the public demo.

- [x] D1: Dedicated FalkorDB Cloud graph seeded and connection verified without exposing credentials.
  EVIDENCE: Authenticated Cloud ping succeeded; GRAPH.LIST was empty before seed. Seed completed with 509 Version, 464 Package, 375 Maintainer, 135 Advisory, 10 Service nodes and 2955 base relationships; prior investigation seeded. User explicitly approved non-TLS free connection.

- [x] D2: Vercel production environment configured, deployment Ready and public health/graph/investigation/MCP smoke checks pass.
  CHECK: node scripts/deploy-smoke.mjs
  EXPECT: DEPLOYMENT_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=f7d5f921aadda7ae8b33a95d569493d875d882aa87ae068e71bb202be2324fe1; exit=0; EXPECT=matched; output-sha256=af4002bc54dc7509d71cd7dac31f2ccb3a10088a68e4f4a25472f9b6a37d5456; output-bytes=121; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/blast-radius; path=c8b5927152e5/30 entries

- [x] D3: Browser CVE, evidence, key holders and memory flows pass against the production URL.
  EVIDENCE: Production browser completed 11-claim brief, 5 exposed services/3 tier-1, payments-api evidence path, ljharb 8/10 reach and memory recall after reload. No console errors. Screenshot saved in user handoff outputs.

- [x] D4: Live URL and cloud operating instructions saved; repository and user handoff reflect actual deployment state.
  EVIDENCE: README and DEPLOYMENT record production URL, private repo, Cloud setup and deterministic mode; handoff copy and brain updated.
