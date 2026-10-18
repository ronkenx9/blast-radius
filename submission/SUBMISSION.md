# Graph Hacks submission — Blast Radius

Updated 18 October 2026. The user independently filed the submission; WeMakeDevs showed **Submitted** at **16:55 Lagos**, with all three tracks and the filled answers. This file preserves the prepared answers and observed filing state. See [the release record](RELEASE.md) for the verified application checkpoint and remaining media work.

## Project title

Blast Radius

## Description

When a vulnerable dependency makes the news, a security team needs more than a list of packages: which services are exposed, how does the dependency reach them, who owns those services, and what should happen next?

Blast Radius is a graph-powered incident workspace for security and engineering teams. Pick an advisory and every affected layer lights up together: vulnerable package versions, connecting dependencies, services, teams and on-call people. A four-stage investigation produces an evidence-linked brief, recalls earlier investigations and exposes the same graph tools through MCP. A scheduled advisory check can create a persistent alert and email the configured admin, with a short plain-English summary, affected owners, concrete next steps and a link back to the map.

The working demo combines real npm dependency and OSV vulnerability records with a clearly fictional company, Lagos Ledger. Its featured qs advisory reaches five of ten services through transitive dependencies, including three tier-1 services. No service lists qs directly.

FalkorDB powers the traversals, ownership context, investigation memory and alert state. The deployed demo uses reproducible graph-based narration; an optional model can rewrite the brief with evidence checks. It reports dependency exposure, not proof of a breach, and does not yet ingest a customer's repositories.

## Tracks

All three tracks were selected. Track 1 is the primary fit:

- **Track 1 — Agents That Act on Connected Data:** multi-hop exposure queries, shortest paths and PageRank are callable tools; graph results determine the brief and incident alert.
- **Track 2 — Agent Memory and Coordination:** investigations, agent-authored findings and evidence persist in FalkorDB. Follow-up runs link to previous runs and supersede their briefs. The four stages share the same graph; this is a sequential workflow, not a claim of autonomous concurrent agents.
- **Track 3 — Company Brain:** services connect to teams, on-call people, architecture decisions and incident history, making an advisory actionable in a company context. This company layer is synthetic.

Track descriptions and permission to enter all three: [official track overview](https://www.wemakedevs.org/hackathons/falkordb#tracks).

## Repository

https://github.com/ronkenx9/blast-radius

Verified public on 18 October 2026. The form opens this URL as the project.

## Demo video

Submitted link: https://youtu.be/WtkidDnVEtA

The user uploaded this unlisted, approximately 33-second overview and filed it in the video field. A separate 105.667-second working walkthrough is finished locally; no uploaded YouTube URL for that longer video has been verified. The submitted state does not establish organizer approval of the video or eligibility.

## Live demo or deployment

https://blast-radius-murex.vercel.app

Featured incident: https://blast-radius-murex.vercel.app/?advisory=GHSA-6rw7-vpxm-498p

## How did you use FalkorDB in your project?

FalkorDB is the application's primary data and context layer. We join resolved npm versions and dependency edges from deps.dev, advisory matches from OSV, public npm maintainer handles, and a synthetic company graph of services, teams, on-call people, decisions and past incidents.

Parameterized Cypher traverses Service → DEPLOYS → Version → DEPENDS_ON → vulnerable Version to find exposure, then joins the responsible team and on-call person. shortestPath returns a concise evidence path for each service/version pair; a separate route query collects all affected branches for the incident map. PageRank over Version/DEPENDS_ON, combined with service reachability, highlights maintainer concentration.

Each investigation writes Investigation and Finding nodes. EVIDENCE edges connect findings to their source entities, FOLLOWS_UP preserves continuity between runs, and SUPERSEDES links replacement briefs to earlier findings. Persistent alert IDs, status and leases support email deduplication and retry. An MCP endpoint exposes the same query-backed tools to other assistants.

These relationships determine the output; they are not just a visualization. Removing FalkorDB removes the exposure calculation, organizational context and persistent investigation memory. The graph model and executable Cypher examples are included in the repository.

## Blog link

No published blog URL is available. The repository's `blog.md` remains an unpublished draft.

## What did you like about FalkorDB?

The most useful part of this build was keeping dependencies, company ownership and investigation memory in one queryable graph. Cypher made the exposure question readable as a path, and shortestPath gave the interface an explanation it could show directly. The built-in PageRank procedure added a second view of concentration without a separate analytics service. The same Node client and queries worked with the local development database and FalkorDB Cloud.

## What improvements would you like to see in FalkorDB?

A clearer first-run path for a Next.js app deployed on Vercel would help: one guide covering Cloud connection settings, TLS availability, serverless connection reuse, seeding and health checks. A supported macOS quickstart that clearly distinguishes Docker from FalkorDBLite would also reduce setup friction. For this type of graph application, end-to-end examples of durable agent memory and idempotent background jobs would be valuable.

## AI assistance disclosure

AI coding assistants helped implement, debug, document, test and deploy this project and prepare its demonstration media. The participant supplied the product direction: show all affected layers of a dependency incident at once and notify the configured admin. The implementation and verification record are available in the repository. The entrant remains responsible for understanding and explaining the model, queries and architecture; this record does not attest to a personal review that has not been confirmed.

Runtime AI is separate from coding assistance. The deployed demo runs without a model key using deterministic graph-based output. Optional LLM narration is limited to the Commander's wording and has evidence-ID and entity-token checks; those checks do not establish that every natural-language statement is correct.

## Filing and release status

- Public repository and live application verified; see [RELEASE.md](RELEASE.md) for the exact application commit and deployment.
- User-uploaded overview URL is recorded above. A longer working walkthrough has no verified YouTube URL yet.
- WeMakeDevs showed **Submitted** at 16:55 Lagos on 18 October 2026. The assistant observed this state and did not click the final submit button.
- All three tracks were selected. The blog remains unpublished.
- The legacy recipient property removal executed through live protected settings. Real recipient data is held in server-side `ADMIN_EMAIL`.
- Review [rules and eligibility notes](RULES.md) for the entrant's continuing responsibilities; submitted status is not an organizer ruling.
