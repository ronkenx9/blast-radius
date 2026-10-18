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

The email feature originally stored an admin recipient in `AlertSettings`. The release moved the recipient to private server-side `ADMIN_EMAIL`; live protected settings executed removal of the legacy graph property. The graph now retains only the notification preference. This addresses the identified recipient-storage issue; it is not an organizer ruling on overall eligibility.

Local Git history records work on 18 October 2026, within the event window; it does not independently establish when every original coding/design step occurred. The entrant must confirm timing, team eligibility and their understanding of the submitted architecture. Avoid claiming the participant personally wrote or reviewed code without that confirmation.

The supplied form requires a public or unlisted **YouTube** demo link showing the working project. The user filed the unlisted [short overview](https://youtu.be/WtkidDnVEtA); a longer working walkthrough is a separate deliverable still being finalized. WeMakeDevs showed Submitted at 16:55 Lagos on 18 October 2026. That state confirms filing, not an organizer judgment on video sufficiency or eligibility. The blog remains unpublished.

The verified application checkpoint, production checks, recipient migration and submitted-video status are recorded in [RELEASE.md](RELEASE.md).
