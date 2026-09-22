# Research queue, prospect ratings and firsthand findings

## September 22 results

The catalog grew from 838 to **862 published address records**, with **254 held**. This pass reviewed 38 business records: 24 newly discovered records (23 published and one held), plus 14 existing records. New records include 10 professional offices, eight restaurants and six med spas. Muse Realty's held CRM address was resolved under its original ID. All previously published postal addresses and company IDs were preserved. There are now 342 published CRM address records.

Nineteen dated source passes are recorded in `site/data/research.json`: restaurants, lodging, med spas and professional offices across Fort Mill, Rock Hill, Indian Land and Belmont; plus three held-CRM passes. These are records of sources checked, not exhaustive coverage claims. Zero accepted lodging additions does not establish that no independent lodging exists.

Open **Mailing Lists → Territory coverage and research gaps** to see the queue, reviewed counts, source history, unresolved leads and next actions. Filter to segments with no pass, checked sources or held addresses. The count of reviewed businesses includes rechecks, not just discoveries. **Show this segment** applies the category and territory to the mailing list. Research history is a published snapshot; it does not run searches automatically.

## Ratings and evidence

Each recipient has four independent ratings with reasons, source links and dates:

| Field | Interpretation |
| --- | --- |
| Exterior opportunity | High, potential, limited or unknown. Potential reflects documented building/context evidence; unknown is not a low score. Parcel building area is not paintable surface area. Materials, condition and actual coating suitability need assessment. |
| Decision-maker access | Identified local business owner, landlord/property manager, central facilities, confirmed tenant, business-confirmed authority or unknown. Identifying a business owner does not prove ownership of its building. |
| Evidence confidence | Business website, corroborated sources, registry only, unresolved, unknown or a private firsthand finding. Direct findings apply only to fields actually confirmed. |
| Visit suitability | Public-facing brief visit possible, arrange appointment, home-based or unknown. Existing dated CRM visit restrictions are inherited when no specific mailing rating exists. Public hours do not guarantee availability or permission to solicit. |

No aggregate score silently penalizes missing information. Public ratings cannot claim private direct confirmation. Restaurants are labeled **Restaurants / dining locations**, since some are suites or share buildings; standalone status is not assumed. Nantz's explicit appointment restriction is recorded. Spa/office appointment recommendations are distinguished in their reasons from explicit appointment-only policies.

After a completed call or visit, choose **Log activity / firsthand finding → Log completed activity → What did you learn firsthand?** Select only what was learned and explain the source/observation. The activity date dates the finding. For each field, the latest completed contact date takes precedence, then update time and ID break ties. Editing an old contact does not displace a later contact. An explicit unknown can supersede an earlier claim. Removing an activity removes its findings from current ratings; restoring it restores its eligibility.

Findings change rating filters and relevant approval-route filters immediately, and visit findings also update the networking directory. They survive offline reloads and are included in Tracker JSON backups and the review CSV. Version 1 backups without findings remain accepted. Importing a Tracker backup on another device restores the findings. Private findings remain in that browser; they are not written into GitHub or automatically synced. If Tracker storage cannot load, rating/approval-filtered exports stop rather than silently ignoring private findings. Postal exports retain their existing eight columns.

## Property research

Seven York County address points were matched to parcels through the official [York GIS](https://www.yorkcountysc.gov/234/GIS) / [OneMap](https://experience.arcgis.com/experience/e827d330f20a4508aa6777bf2c0b94e3) services. Selected evidence is in `parcel-checks-2026-09-22.json`; ratings show the recorded owner, parcel ID and separate business–owner relationship.

Matches cover Bice Law's two offices, Fish Market, Nantz Fort Mill, Palmetto Breeze, Metrolina and East Main Guest House. East Main has a documented operator relationship from tourism reporting, not confirmation of present contracting authority. Bice's matching surname remains unresolved identity evidence. Different LLC names do not prove tenancy. Nantz's parcel land-use description conflicts with current office use and is flagged. Metrolina's address also has a suite point; confirm delivery details before a large mailing.

Lancaster County's official [GIS hub](https://www.lancastercountysc.gov/302/GIS) links its [2026 parcel map](https://experience.arcgis.com/experience/dd25a372d14a44dcbb74ab40609f5a48). Eight exact street-number/road queries covering nine reviewed Indian Land businesses returned no match in that service. These records show unresolved property research. Map/address-point matching remains necessary; empty results establish neither ownership nor tenancy. No unrelated residential owner mailing addresses were imported.

## Specific unresolved work

- Flipside Cafe: official address lacks a suite while county address points list multiple suites. Newly held; do not invent the unit.
- Reeves: street address found but unit evidence remains inconsistent. Elite and Broad Connection do not publish a usable street address on reviewed contact pages. Rent Now's location page could not be retrieved; Albright's reviewed page did not establish a complete mailing address. All five remain held.
- Independent lodging: Fort Mill and Indian Land source checks yielded no accepted new in-area independent lodging address. Lancaster's Laurel Haven is outside the requested Indian Land segment. East Main and Villa at Waters Edge were rechecked as existing records.
- Several official pages blocked direct retrieval or timed out, including Hester Payseur and some tourism/contact pages. Indexed or secondary evidence is labeled; failure is not evidence that a business closed. Belmont professional-office discovery remains open.
- Most prospects still lack verified building condition, material suitability, owner relationship and actual exterior approval authority. County matches alone cannot supply these facts. The rest of the territory and held queue need further passes.

## Repeatable update procedure

1. Select the next city/category queue segment; check official business websites, local directories and relevant registries. Record failed retrievals and unresolved candidates too.
2. Verify identity and complete address, preserve suites, check normalized duplicates, and keep distinct organizations distinct. A plausible address is not USPS validation. Publish only accepted address records; retain uncertain ones as held.
3. Match the official county parcel/address evidence, preserving unknown relationships. Add separate ratings only where evidence supports them.
4. Prepare a dated reviewed input using `research-pass-2026-09-22.json` as the example. Existing recipients use `recipientId`; new candidates use unique review keys. Each pass lists sources, reviewed keys, unresolved leads and a concrete next action.
5. Run `node scripts/apply-research-pass.mjs docs/<reviewed-pass>.json`, then `node scripts/build.mjs` and the tests. The importer validates the complete catalog and source log before writing. Reapplying the same input preserves IDs and replaces its pass entries without duplicating businesses. Review the diff before publishing.

The importer does not discover or automatically approve records. CRM directory research and public visit policies still use the sibling CRM's export workflow; this mailing/research catalog is maintained in this repository.
