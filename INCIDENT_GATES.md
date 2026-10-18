# Gates: incident map and email alerts
OWNS: src scripts .github .env.example README.md INCIDENT_GATES.md

- [x] I1: Incident overview highlights all affected dependency branches, services, teams and on-call people together and allows returning from individual evidence paths.
  EVIDENCE: Production local browser showed 5/10 affected services, 3 tier-1, 4 teams, simultaneous graph branches. Clicked payments-api evidence then Show all affected areas; restored overview. Admin key unlocked onboarding; absent provider disables test send.
- [x] I2: Authenticated advisory monitoring persists deduplicated alerts and routes email to configured authorized recipients; public simulation cannot send email.
  CHECK: node --import tsx scripts/test-alerts.ts
  EXPECT: ALERTS_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=9d821c2c3006aab984ac95dfc5f320a15ae0965b385bcb3b704a26ca9c3c759a; exit=0; EXPECT=matched; output-sha256=8146ba943177dd871524abe490715445d267f92397a70c524c06001d5fa4c72f; output-bytes=16; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/blast-radius; path=c8b5927152e5/30 entries
- [x] I3: Production build and type/lint checks pass.
  CHECK: npm run verify:build
  EXPECT: BUILD_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=2e99e7ae391e1abf8bfc0f359557a386064ef7f2ce89762d60476a214ac91a9d; exit=0; EXPECT=matched; output-sha256=97c906790188bf11262413048b52ab3b3346f863cc25db22cc2be4bf3752d4b5; output-bytes=1982; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/blast-radius; path=c8b5927152e5/30 entries
- [x] I4: Live deployment and monitoring verified; protected admin onboarding and provider setup requirements documented. Provider acceptance tested with mocked responses; real delivery only if credentials and recipient are supplied.
  EVIDENCE: Vercel production Ready; live smoke passed (5 exposed, 11 claims, 8/10 maintainer reach); live impact 20 nodes/21 edges. GitHub monitor run 39136023735 passed and public last-scan status updated. Production owner key unlocks setup; email/provider absent and test-send disabled. Layered overview browser verified locally; final release verified after push.
