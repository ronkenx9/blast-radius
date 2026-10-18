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
  EVIDENCE: automatic-evidence=v1; definition-sha256=2e99e7ae391e1abf8bfc0f359557a386064ef7f2ce89762d60476a214ac91a9d; exit=0; EXPECT=matched; output-sha256=5d71a27fca589a76b1936c635f8ae9fae939aa899dbaf9253fdc0060971d7d6c; output-bytes=1982; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/blast-radius; path=c8b5927152e5/30 entries
- [ ] I4: Live deployment and monitoring verified; protected admin onboarding and provider setup requirements documented. Provider acceptance tested with mocked responses; real delivery only if credentials and recipient are supplied.
  EVIDENCE: pending
