# The CVE didn't name my dependency. The graph did.

*How I built Blast Radius, a multi-agent supply-chain war room on FalkorDB, solo, for Graph Hacks.*

A new advisory lands for `qs`, a query-string parser. You search your repos and none of them depend on `qs`. You close the tab.

You're wrong. In my demo company, five services use it, three of them tier-1. Two routes lead there: `express@4.17.1 → qs@6.7.0` and `request@2.88.2 → qs@6.5.5`. The danger is in the transitive dependencies, and a flat list of packages can't show you paths.

That's the problem I picked for Graph Hacks. "Are we exposed?" sounds like a lookup. It's really a walk:

```
Advisory → vulnerable Version ← DEPENDS_ON* ← direct dep ← DEPLOYS ← Service ← OWNS ← Team
                                                                    ← ON_CALL ← Person
                                                                    ← ABOUT   ← Decision (ADR)
                                                                    ← INVOLVED ← Incident
```

## One graph, two worlds

Blast Radius joins two graphs in one FalkorDB instance:

1. **Real public npm data.** Resolved dependency trees from deps.dev, advisories from OSV.dev queried per exact resolved version, and publishers from the npm registry (usernames only, no emails). That's about 1,500 nodes.
2. **A company graph.** "Lagos Ledger", a fictional fintech: teams, people, services with tiers, on-call rotations, architecture decisions and past incidents.

The seed is one idempotent script. It caches the raw API responses, so a rebuild runs offline in about five seconds.

## Four agents, one shared memory

- **Scout** opens an `(:Investigation)` and checks whether we've triaged this advisory before.
- **Tracer** runs `shortestPath((s:Service)-[:DEPLOYS|DEPENDS_ON*]->(v))` for every exposed service.
- **Cartographer** is the company brain: owners, on-call, the ADRs that apply ("stay on express 4, but patch immediately") and incidents that hit the same services before.
- **Commander** writes the brief: who to page, the fix path, decisions in play, history, and what changed since last time.

The agents don't pass prompts to each other. They hand off through the graph. Every claim in the brief is stored as `(:Finding)-[:EVIDENCE]->(node)`, so clicking a sentence in the UI flies the 3D camera along the exact path that proves it. Run the same advisory tomorrow and the new investigation `FOLLOWS_UP` the old one, and its brief `SUPERSEDES` the previous one. Memory you can audit, not a growing chat log.

## The finding that surprised me

I added a "Who holds the keys" view: PageRank over `DEPENDS_ON`, rolled up per npm maintainer, plus reachability from every service. One account publishes 54 packages in this tree, 29 of them as the only publisher, and can ship code into 8 of the 10 services. That isn't a criticism of anyone. Open source runs on people like that. But it's exactly the shape of risk behind event-stream, ua-parser-js and xz, and no package list will show it to you. It takes one graph algorithm call.

## Why FalkorDB

- **Cypher for multi-hop questions.** Variable-length paths and `shortestPath` made the core feature one query.
- **Built-in algorithms.** `algo.pageRank` runs where the data is, with no export step.
- **Speed.** Blast-radius queries return in single-digit milliseconds, fast enough to call on every agent step.
- **MCP.** Blast Radius exposes its tools at `/api/mcp`, and the official FalkorDB MCP server lets Claude or Cursor run their own read-only Cypher against the same graph.

## Built fast, honestly

I built this solo in one day with an AI coding agent writing much of the code, while I drove the problem, graph model, queries and design. The app's LLM is optional and only writes the Commander's wording. Facts come from Cypher, and cited evidence ids are checked against the graph. Without a key it runs fully deterministic.

**Try it:** `<VERCEL_URL>` · **Code:** `<REPO_URL>` · **Video:** `<VIDEO_URL>`

*Built for Graph Hacks: Context for AI Agents (WeMakeDevs × FalkorDB). Tracks: Agents That Act on Connected Data, Agent Memory and Coordination, Company Brain.*
