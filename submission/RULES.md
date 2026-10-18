# Graph Hacks rules and release requirements

Checked against the official pages on 18 October 2026.

## Deadline

Submissions close **18 October 2026, 23:59 IST**, equivalent to **19:29 in Lagos (WAT / UTC+1)**. The event started 15 October at 00:01 IST. [Official schedule](https://www.wemakedevs.org/hackathons/falkordb/schedule)

## Rules that affect this submission

- Enter solo or with up to four people; each participant belongs to one team.
- FalkorDB must be central to the working product.
- Use permitted public, synthetic or owned data; the rules exclude personal and restricted information from the graph.
- Main coding and design must begin during the event; disclose AI coding assistance and understand the implementation.
- Include public source, setup instructions, the graph model, the required Cypher or algorithms, a working-project video, deployment or complete local instructions, and selected tracks.

These are release-relevant notes, not a replacement for the [full official rules](https://www.wemakedevs.org/hackathons/falkordb/rules). The entrant is responsible for reviewing them and the linked code of conduct.

All three tracks may be entered. Blast Radius fits connected-data investigation, persistent investigation memory and company ownership context. [Official overview and tracks](https://www.wemakedevs.org/hackathons/falkordb)

## Product-specific checks

The checked source uses cached public package/advisory data and a synthetic company. npm maintainer emails are discarded during seed collection; usernames represent package metadata and must not be presented as evidence of malicious behavior. The backdated seed investigation is demo history, not a real previous incident.

The email feature originally stored an admin recipient in `AlertSettings`. Before filing, the release must verify real recipient data has been moved out of the graph or obtain a clear organizer interpretation. Hiding a field from a public endpoint alone does not satisfy the literal data rule. This is an identified compliance question, not a claim that organizers have ruled on it.

Local Git history records work on 18 October 2026, within the event window; it does not independently establish when every original coding/design step occurred. The entrant must confirm timing, team eligibility and their understanding of the submitted architecture. Avoid claiming the participant personally wrote or reviewed code without that confirmation.

The supplied submission form requires a public or unlisted **YouTube** demo link. A promotional video can support the launch but must not replace a demonstration of the working product. The optional blog link should remain empty until there is a published post.

Release update: the admin recipient is now held in the private `ADMIN_EMAIL` server environment variable. `AlertSettings` stores only the enabled preference; the first protected settings/monitor read removes a legacy `email` property. Public graph data remains public npm/OSV records and synthetic company context. Live migration status is tracked in the release record.
