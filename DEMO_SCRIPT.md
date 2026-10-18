# Demo video script (~2:00)

Record at 1600×960 or 1920×1080. Run `npm run seed` first for a clean memory state. Cursor visible, no music under the voice (or very low).

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:10 | Title card (After Effects): "BLAST RADIUS" over the slow-rotating graph | "A CVE drops. Your repos don't mention the package. Are you safe? Usually, no." |
| 0:10–0:25 | Overview, slowly orbiting graph; hover the top stats | "This is Blast Radius: one FalkorDB graph that joins real npm data (509 resolved versions, 135 OSV advisories, 375 maintainers) to a company graph of teams, people, services, on-call, decisions and incidents." |
| 0:25–0:40 | Click **Simulate CVE drop** → red overlay | "Here's a real one: CVE-2025-15284 in qs. None of our services list qs. Four agents get dispatched." |
| 0:40–1:05 | Agent cards light up one by one; open **Cypher** on Tracer | "Scout opens an investigation in the graph. Tracer runs shortestPath from every service to the vulnerable versions: five services, three tier-1, through express and through request. Cartographer pulls owners, on-call, the ADRs and past incidents. Every step is a Cypher query you can open." |
| 1:05–1:25 | Camera fly-through along payments-api → express → qs; click the payments-api claim | "Commander writes the brief, and every sentence is a Finding linked to its evidence in the graph. Click one and the camera flies the exact path: payments-api, express 4.17.1, qs 6.7.0. Page Ada. ADR-012 says stay on Express 4 but patch immediately. We had a body-parser DoS on this same chain last year." |
| 1:25–1:42 | **Who holds the keys** → red web from the top maintainer | "PageRank over DEPENDS_ON, rolled up per maintainer: one npm account publishes 54 packages in this tree, 29 alone, and reaches 8 of our 10 services. That's the shape of event-stream and xz, in one algorithm call." |
| 1:42–1:55 | **Memory** tab → open yesterday's investigation, then rerun it | "Investigations persist in the graph. Re-run tomorrow and the new one follows up the old one and supersedes its brief, so any agent, or Claude over MCP, picks up where we left off." |
| 1:55–2:00 | End card: Tracks 1·2·3, repo, live URL, "Built on FalkorDB" | "Blast Radius. Know your blast radius before the attacker does." |

**B-roll tip:** a split-screen at 1:42 showing Claude Desktop calling `blast_radius` through `/api/mcp` makes the MCP claim concrete (optional).
