# Blast Radius release and submission record

Recorded 18 October 2026. Times below use Lagos time (WAT, UTC+1).

## Live product and source

- Public repository: https://github.com/ronkenx9/blast-radius
- Canonical live site: https://blast-radius-murex.vercel.app
- Incident workspace: https://blast-radius-murex.vercel.app/app
- Verified application commit: `ae7be54eb1d235bbaa14dbbed445917d73ef3d11`, observed on public `origin/main`.
- Verified Vercel deployment: https://blast-radius-iwoctbzbj-ronins-projects-c7d07daa.vercel.app — **READY**, serving the canonical alias above.
- GitHub verification: [successful workflow run](https://github.com/ronkenx9/blast-radius/actions/runs/39142282858).

This is the exact application artifact covered by the deployment observations below. The documentation and cached-maintainer wording follow-up was published as `28909f605aade4886ebea5829546de910e3cbc15`; its Vercel deployment `blast-radius-1a8etfs3a-ronins-projects-c7d07daa.vercel.app` was Ready and [verification run39143286012](https://github.com/ronkenx9/blast-radius/actions/runs/39143286012) passed.

## Verification result

The production smoke check returned `DEPLOYMENT_VERIFIED`: 10 services, 5 exposed services for the featured advisory, 1,522 display nodes, 11 deterministic brief claims and a top-maintainer reach of 8 services. The deployment reported deterministic mode; no model key is required and no live-model result is claimed.

A live browser check completed the landing page → `/app` → incident simulation flow. The map showed the affected areas, the nonfunctional Fit control had been removed, and the observed browser error list was empty. These are functional observations for this release, not a guarantee against every possible interface or security defect. The broader source, graph and regression audit is in [AUDIT.md](AUDIT.md).

## Admin alert migration and real test

The live protected settings request succeeded with `recipientLocked: true`, provider readiness and notifications enabled. The configured address now comes from the private `ADMIN_EMAIL` server environment variable. The request executed the idempotent removal of the legacy `AlertSettings.email` property; the graph keeps the notification preference without storing the recipient.

Exactly one authorized new incident test was accepted by the email provider. Resend showed **Delivered at 16:53 Lagos**. The current Gmail connector did not surface that new message, so this record does not claim new inbox-placement confirmation. Earlier inbox evidence belongs to the earlier email release. No recipient address, access key, test ID or provider message ID is published here.

The current sender is limited to the approved account's own inbox. Other recipients require a verified sending domain. Public incident simulations do not email. Monitoring checks published advisories against a synthetic seeded inventory; it does not detect intrusion or automatically verify deployed patches.

## Submission observed

The user independently uploaded a short overview to YouTube as unlisted and filed the WeMakeDevs submission. The app's **Submitted** state was observed on **18 October 2026 at 16:55 Lagos**, with all three tracks selected and the form answers filled. The assistant did not click the final submission button. This records the platform state, not an organizer eligibility ruling or judging outcome.

The entry was updated at **17:14 Lagos**. A refreshed server view confirmed the full walkthrough link with all three tracks and the existing answers preserved.

Submitted video: [Blast Radius — 1:46 working walkthrough](https://www.youtube.com/watch?v=dCOheNpA5T4).

The separate 105.667-second working-demo video and 32.533-second promo are finished. Both are 1080p H.264/AAC with ElevenLabs narration, subtitles, source notes and an editable archive. Final decoded frames and audio measurements were reviewed; zero clipped samples were found. With the user’s explicit approval, the full walkthrough was uploaded as unlisted: https://youtu.be/dCOheNpA5T4. YouTube confirmed “Video published,” duration1:46, an English subtitle track, and no initial copyright/community issues. The description includes source credits, chapters, repo/live links and ElevenLabs disclosure. The saved submission now uses this full walkthrough. The blog in `blog.md` remains an unpublished draft; no blog URL is claimed.

## Supporting files

The user-facing output folder contains `Submission-Final.png`, `Blast-Radius-Live-Landing.png`, `Blast-Radius-Live-Incident.png` and `Email-Delivered-Release.png`. Email/provider screenshots are private verification artifacts and should not be included in public media without appropriate sanitization. Copy-ready answers are in [SUBMISSION.md](SUBMISSION.md), the graph model in [GRAPH_MODEL.md](../docs/GRAPH_MODEL.md), and runnable examples in [QUERIES.md](../docs/QUERIES.md).

The event deadline is 18 October 2026 at 19:29 Lagos. Submission state was observed before that deadline. Subsequent edits should preserve the distinction between this verified application checkpoint, the initial filing, final full-demo link and any later deployment.
