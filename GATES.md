# Gates: Blast Radius local setup and deployment readiness

OWNS: **

Scope: Extract and install the supplied project, verify the real local graph and browser demo, and prepare deployment instructions and configuration.

- [x] G1: Type checking, lint and production build pass.
  CHECK: npm run verify:build
  EXPECT: BUILD_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=2e99e7ae391e1abf8bfc0f359557a386064ef7f2ce89762d60476a214ac91a9d; exit=0; EXPECT=matched; output-sha256=3c6e15c19cb49987f5a2831a47638981731962a67786856854c51d238c8395a5; output-bytes=1646; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/blast-radius; path=c8b5927152e5/30 entries

- [x] G2: Seeded FalkorDB supports investigation, evidence, memory and MCP flows.
  CHECK: npm run test:integration
  EXPECT: INTEGRATION_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=a8f5caf84d7f228a9200abb6db8371012238d64978380748e732907cafe33688; exit=0; EXPECT=matched; output-sha256=4bb0ac8ab505e93c0b97c477717a9ad6cd8eeebb75f4080533d866a5253694b1; output-bytes=301; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/blast-radius; path=c8b5927152e5/30 entries

- [x] G3: Browser demo completes with rendered graph, evidence navigation, key holders and recalled memory.
  CHECK: npm run test:e2e
  EXPECT: BROWSER_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=9873fd8aed9e0f167724f3eff7c93afe7dd4373bbb81bbdb93fb06fa0d36c269; exit=0; EXPECT=matched; output-sha256=b0ba93ce0fbf3bded89fff0c8a9996149878f6b93a20a7e3752c1fc0f5336110; output-bytes=77; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/blast-radius; path=c8b5927152e5/30 entries

- [x] G4: Deployment configuration and environment documentation are complete; cloud-dependent steps are explicitly identified.
  EVIDENCE: DEPLOYMENT.md and .env.example reviewed; vercel.json, Node 22 pin, secret/build exclusions, manual Cloud seed, remote smoke steps, and model-key limits documented. Local database restart preserved all 7 investigation IDs. Docker alternate and real Cloud/model deployment remain explicitly untested.

- [x] G5: GitHub repository created and verified project pushed without secrets or local data.
  EVIDENCE: Private repository https://github.com/ronkenx9/blast-radius created; main pushed successfully. Staged-file scan excluded .env.local, local database/runtime, node_modules, .next and test-results, and found no credential signatures.
