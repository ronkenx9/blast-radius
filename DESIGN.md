# Blast Radius design system

Blast Radius is an operating workspace for tracing a dependency advisory to services and the people responsible for them. The visual direction is the user’s approved Teampot reference: a light, quiet interface around a dark graph canvas, generous spacing, black pill controls and restrained orange incident states. The graph is the working artifact, not a background decoration.

## Surfaces and layout

The workspace uses a single navigation row for Incident room, Key holders and Memory. The active destination is a dark rounded pill; the workspace name and email settings sit separately at the right. A short task heading and the primary simulation action precede the workspace.

At desktop sizes the workspace has three columns: the advisory and agent activity rail, the graph stage, and the incident report. The activity rail uses open rows and hairlines. Only the graph stage and report need enclosing surfaces. Avoid adding another navigation strip inside the report or putting a separate card around every finding.

The graph stays dark in all destinations. Its toolbar identifies the current view; a small footer explains the legend or interaction. Selecting a finding reveals its graph path. The report provides readable service names, owners and findings alongside the visual evidence.

At widths up to 1,000 px, Map, Feed & agents, and Report select one panel at a time. Each panel takes the available width; page scrolling remains available. Below 600 px, the primary navigation moves below the brand and the simulation action spans the content width. The activity feed and agent stages stack. No panel floats over another panel on mobile. On phones, the layered diagram retains a readable 600 px drawing width inside a locally scrollable canvas, with an explicit scroll hint; it does not widen the page.

The protected alert setup route uses the same brand, typography, buttons and field vocabulary. It presents one focused form, with explicit access, provider, saving and test-delivery states. The configured recipient is read-only when the server locks it.

## Tokens

| Role | Token | Value |
| --- | --- | --- |
| Workspace ground | `--bg` | `#f7f8fa` |
| Report and form surface | `--panel` | `#ffffff` |
| Hairlines | `--line` | `#e2e5e9` |
| Main text | `--text` | `#1d232b` |
| Secondary text | `--muted` | `#646e7b` |
| Incident accent | `--crit` | `#c64f2c` |
| Warning | `--warn` | `#997019` |
| Evidence links | `--info` | `#345f9d` |
| Connected / complete | `--ok` | `#38735e` |
| Graph ground | `--canvas` | `#10151d` |
| Graph text | `--canvas-text` | `#edf0f4` |
| Graph secondary text | `--canvas-muted` | `#a6afbd` |

Orange means exposure or attention. It is not the page’s decorative color. Green is reserved for connected or completed states. The graph keeps its established category colors because users need to distinguish services, teams, versions, maintainers and advisories. Dark-canvas colors must not be reused as small text on white surfaces.

## Typography and spacing

Geist is the single interface family. Geist Mono is reserved for advisory identifiers, dependency identifiers, Cypher and data paths. Workspace headings are 23–25 px, with a slightly tighter tracking of approximately -0.035 em. The setup heading is 30 px. Report headings remain subordinate to the task heading; findings use comfortable line height and sentence case.

The desktop page gutter is 28 px, widening to 38 px above 1,600 px and becoming 16 px on small phones. Panel gaps are 20–24 px. Report content is inset 20–24 px. Open lists use restrained hairline separators rather than repeated elevated cards. Main panel radii are 14 px; input fields are 8 px; pills are reserved for navigation and actions.

## Controls and state

Primary controls have a charcoal fill and white text. Secondary controls have a white fill and a neutral border. Buttons preserve their label during loading and disable duplicate actions. Inputs have persistent visible labels and descriptive text. Focus rings use the incident accent with an offset so keyboard focus is visible on both light and dark surfaces.

Every request exposes a useful failure message. The workspace error can be dismissed; a failed task can be retried. Investigation memory provides an empty state that explains how to create the first entry. Loading the graph, recalling a run and sending a test have distinct state text.

The graph does not rotate automatically. User-driven orbit and evidence-path motion remain available. CSS motion respects reduced-motion preferences, and camera focus becomes immediate when that preference is set. The brief incident notice is the main transition; unrelated elements do not stagger into view.

## Product truth in the interface

The footer labels the company synthetic and the npm/OSV source data real. Model state is explicit. A deterministic run is never presented as AI-generated. An affected service means dependency exposure, not a confirmed breach. Manual simulations do not send email. Email state says accepted by the provider until stronger delivery evidence is available. Monitoring is described as a scheduled advisory check, not an intrusion sensor.

Keep personal recipient information inside the protected setup flow. The public map can show fictional service ownership and on-call data, but never the real admin inbox or access key.

## Explanatory landing page and identity

The front door at `/` uses the same neutral palette and button language with more open spacing. A left-aligned problem statement sits beside a dark explanatory map based on the real qs demo; its caption clearly calls it an illustrative overview. A concise result strip establishes that five of ten services are exposed despite no direct qs declaration. Three numbered steps explain the actual sequence, followed by evidence, memory and admin-alert capabilities. All primary actions open `/app`; the footer links the source repository.

The landing page uses Geist headings at 53–58 px on wide screens, 39 px on phones, and restrained 12–15 px supporting copy. The hero stacks below 850 px. Below 600 px the descriptive header links disappear while the demo action remains visible. Sections use open composition and hairlines, with a single quiet closing action panel.

The custom logo is a small orange origin connected to three charcoal nodes, with an outer arc joining its reachable boundary. It deliberately uses the product’s graph relationship rather than a shield or crosshair. `Brand.tsx` is the shared inline implementation; `public/brand/blast-radius-mark.svg` is the standalone vector. The wordmark stays in the interface family. Brand links return to the landing page; the setup back link returns directly to the incident workspace.

Evidence selection now frames the complete highlighted path immediately. Individual breadcrumb controls still focus a node. The 3D graph uses its original renderer without decorative bloom, preserving the intended dark background and readable labels.
