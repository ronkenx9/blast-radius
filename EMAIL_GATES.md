# Gates: live email provider activation
OWNS: EMAIL_GATES.md src/app/api/admin/alerts/route.ts src/lib/alerts.ts
- [x] E1: Authorized sender/provider connected to Vercel without exposing credentials.
  EVIDENCE: Production sending-only Resend key, ALERT_FROM and published template configured; deployment dpl_BPKj5SmJwmDrGHjAueDqtNzFXiq1 Ready on 2026-10-18. Official SDK build and mock acceptance/rejection checks passed. Temporary key file removed.
- [x] E2: Intended admin recipient saved and email notifications enabled through protected onboarding.
  EVIDENCE: User-approved own-inbox recipient saved through /setup; checked enable control and save success; provider connected visible. No recipient or key committed.
- [x] E3: A real incident alert traverses persistence and delivery; provider result and inbox receipt verified.
  EVIDENCE: UI test created test-eff20c28-c0f4-42bf-8db6-6023a5371ee7; Resend 01a14f82-f28a-7248-a58e-f8b9ad811f62 Delivered at 2026-10-18T14:55:44Z. Gmail message 1a14f82f5440b395 has INBOX label; body verified with five services, owners, dependency paths and affected-map URL. Published template substitution rendered correctly.
- [x] E4: Repeat processing does not resend the accepted alert; public simulation remains unable to email.
  EVIDENCE: Two authenticated replays of the same test ID returned identical provider ID; one durable alert and one Gmail message remain. Public investigation completed without changing alert queue; anonymous test endpoint returned 401. Source has no delivery call from public investigation.
