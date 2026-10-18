# A dependency alert should show where it spreads

*Draft for publication — not yet published. Built for Graph Hacks: Context for AI Agents.*

A vulnerability appears in `qs`, a query-string parser. None of a company's services lists `qs` as a direct dependency. That can make the alert look irrelevant, even while the package sits underneath several important services.

In Blast Radius's fictional company, Lagos Ledger, the featured advisory reaches five of ten services. Three are tier-1. Two short paths explain why: `express@4.17.1 → qs@6.7.0` and `request@2.88.2 → qs@6.5.5`. Knowing the vulnerable package is only the beginning. The useful answer includes the services, their owners, the evidence and the next action.

That became the product direction: when a dependency gets hit, light up every affected layer at once and notify the configured admin.

## From a package name to an actionable map

Blast Radius joins public dependency data with a synthetic company graph in FalkorDB. Resolved npm versions and dependency edges come from deps.dev. Advisory matches come from OSV. Public npm maintainer handles add a view of concentration. Lagos Ledger contributes fictional services, teams, on-call people, architecture decisions and past incidents.

The seeded inventory contains 509 package versions. These are graph records, not vulnerable packages installed into the Blast Radius application. Cached source responses make the dataset reproducible. Re-seeding deliberately rebuilds the graph, so ordinary deployments preserve existing investigation history instead of starting over.

The core query follows a service's deployed dependencies through `DEPENDS_ON` edges to an advisory's affected versions. It then joins the team and on-call person. A shortest path gives each exposure a compact explanation. A separate query collects every connecting branch for the complete incident map.

That distinction mattered. One highlighted path can explain one service while hiding the wider incident. The overview needs to show all affected services together; individual evidence paths are there when someone wants to inspect a claim.

The interface now starts with a concise introduction, then opens a dedicated workspace. A custom mark, restrained typography and light or dark graph canvases give the map room to breathe. The important visual event is the same in either theme: the connected areas light up as a single incident.

## An investigation that leaves a record

The workflow has four sequential stages. Scout reads the advisory and opens an investigation. Tracer finds exposed services and their paths. Cartographer adds ownership, decisions and incident history. Commander produces the brief.

These stages share FalkorDB context and persist their findings. They are not four independent language models. The live demo runs deterministically without a model key; an optional model can rewrite Commander's wording. Its evidence-ID and entity-token checks filter some unsupported output, but do not prove every sentence correct.

Each saved finding connects to its source entities through `EVIDENCE` edges. A later investigation connects to its predecessor through `FOLLOWS_UP`, while `SUPERSEDES` connects replacement findings to the previous brief. This gives the Memory view something concrete to reopen. The seed includes an explicitly backdated demonstration run, not a claim that a real company experienced that incident yesterday.

The same query-backed capabilities are available through the application's MCP endpoint. Another assistant can inspect exposure, ownership, maintainer concentration or previous investigations using the product's tools.

FalkorDB's built-in PageRank procedure also supports the key-holder view. Combined with service reachability, it shows how widely packages associated with a maintainer appear across the inventory. That is a concentration measure in a snapshot. It is not an accusation, a live permission audit or a prediction that an account will be compromised.

## Closing the gap between seeing and acting

A useful alert should not require the recipient to decode a graph trace. Blast Radius's email explains the issue, lists affected services and owners, and gives three actions: update the affected dependency using the advisory's fix information, prioritize critical services, then test and verify the resolved version. A link opens the full map.

The delivery path stores alert state and uses a stable provider idempotency key to reduce duplicate sends. A real test through Resend reached the approved account's own inbox, and replaying that test did not create another message. The current test sender supports that inbox; other admin recipients require a verified sending domain.

The scheduled monitor checks published OSV advisories against the seeded inventory. It does not detect an active intrusion, import customer repositories or automatically update the inventory after a patch. Those boundaries belong in the product, especially when the visual presentation makes an incident feel immediate.

The main lesson was that an exposure path becomes much more useful when ownership and memory are attached to it. FalkorDB let those questions share one model: what is affected, who can act, and what was learned before.

AI coding assistants helped implement, debug, test, document and deploy the project. The product direction was to connect a dependency incident to every affected area and an actionable admin alert. The repository includes the graph model, Cypher queries and verification notes so the implementation can be inspected and explained.

Try the [live product](https://blast-radius-murex.vercel.app), open the [incident workspace](https://blast-radius-murex.vercel.app/app), or inspect the [source code](https://github.com/ronkenx9/blast-radius).
