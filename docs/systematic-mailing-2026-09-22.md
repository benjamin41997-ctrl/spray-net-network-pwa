# Systematic mailing research — September 22, 2026

The published catalog grows from 127 to **838 exportable addresses**. **254 records remain held**, with reasons. Counts describe collected address records, not unique buildings, independently verified current occupants, or complete market coverage.

## Source passes

| Source pass | Scope and outcome |
| --- | --- |
| Existing CRM | Audited all 557 company records against accepted evidence for street, city, state and ZIP. 337 initially passed; four current website checks resolved mailing addresses, bringing usable CRM records to 341. The remaining 216 CRM records stay held. Existing company IDs are preserved. |
| Gaston County Schools | Reviewed the full elementary, middle and high-school lists and retained schools in territory cities. Virtual programs sharing campuses were excluded. |
| Union County Public Schools | Reviewed the current district contact directory and retained territory-city schools. Together the two district passes add 60 schools. |
| CaroMont Health | Read all 11 public search-result pages (102 location records). Kept 63 distinct medical-office delivery locations in territory cities after scope filtering and consolidation. Separate suites remain separate. Hospital, pharmacy and residential-care entries were excluded. |
| CMS NPPES | Completed 48 organization-only dental/clinic searches across 24 ZIPs, including zero-result searches. Found 345 eligible organization candidates. After identity review and consolidation, 247 registry addresses are exportable; 38 ambiguous or potentially virtual/admin locations are held. Remaining candidates duplicate represented delivery locations or known businesses. No individual-provider contact details were published. |

Registry records may lag occupancy and trading-name changes. The app shows their source type and registry update date. The review date means the registry evidence was reviewed on that date, not that the office was contacted or postal delivery verified. Practice-location addresses were retained for targeting the local business; off-site administrative and personal mailing addresses were not substituted.

Published category counts: 253 dental; 109 school/program; two district; nine veterinary; four funeral; 11 childcare; six church; five venue; 76 medical; eight med-spa; three standalone restaurant; three independent lodging; eight professional; 37 property-management; 234 real-estate; 70 cabinet/kitchen.

## Approval routes

- **Likely business / owner:** four evidence-backed starting points (Red Barn Events, He Will Farms, and the two McLean Funeral Directors locations). Business/family operation is evidence for whom to contact, not proof of title to the building.
- **Likely landlord:** suite/unit evidence suggests a shared property; the tenant could also own a unit, so landlord/association authority must be confirmed.
- **Central facilities / district:** public schools and health-system locations should be approached through their facilities/procurement route.
- **Unknown:** no adequate evidence. Standalone appearance or a business-license address does not establish ownership.

Every published record includes its route, reasoning, evidence URL and review date. The app can filter by route and by address source. These fields travel in backups/export snapshots; postal Excel/CSV exports retain their original eight columns.

## Coverage and remaining gaps

Coverage tracks all categories across 20 named research areas, plus other regional offices. Every area remains labeled partial or a research gap; no cell claims exhaustive coverage. Ballantyne is grouped by ZIP 28277, Indian Land by 29707, and Lake Wylie includes Clover postal addresses. Otherwise counts use the published postal city, which can differ from municipal boundaries. Schools carrying a Matthews mailing address may serve Weddington. Postal addresses are preserved verbatim.

The largest unfinished categories are veterinary, childcare, church, venue, med-spa, standalone restaurant, independent lodging and professional offices. Current records in those categories are useful starts, not completed city sweeps. The CMS pass covers organization NPIs and selected clinical taxonomies only; it misses practices registered solely under individual providers and other specialties. Zero CMS results do not prove there are no businesses.

The 216 held CRM companies mostly lack accepted structured addresses. Other reasons include conflicting evidence, non-HTTPS evidence and out-of-state addresses. Four website checks override mailing holds without silently altering historical CRM conflicts. Muse Realty and Reeves Property Management remain held pending clear current address evidence. The earlier Virtu Cosmetics conflicting-address issue also remains unresolved.

Three registry aliases (803 Dental, West Town Dental Care and Lakeshore Dental) were removed in favor of their existing reviewed business records. Ambiguous registry identities at one delivery address are represented once and held. This is not a complete audit of alternate legal/trading names across every source. Use the optional one-per-delivery-address filter when mailing to co-located businesses.

## Reproducing and continuing research

The import scripts are local maintenance tools; they do not put keys, network calls or database files into the hosted PWA.

1. `python scripts/import-crm-mailing.py PATH_TO_NETWORKING_DB` reads the database in read-only mode, audits evidence and imports original company IDs. Current manual website overrides are retained.
2. `python scripts/discover-healthcare-mailing.py OUTPUT_DIRECTORY` queries the free public CMS API, checkpoints each ZIP/category and writes candidates plus a query report. It never publishes automatically. Use a new output directory for a fresh research date/pass; review the script's date and scope before running.
3. Review candidates, then `python scripts/import-researched-mailing.py docs/research-2026-09-22` applies this reviewed pass. New IDs are append-only; existing recipient IDs are retained.
4. Build and run mailing/update tests before publishing. Review aliases and conflicting occupants before accepting more candidates.

The checked-in candidate files contain business names, addresses and public evidence only. Full source pages, personal provider contacts, API keys and the CRM database are not published. Raw research snapshots remain local. The CRM audit, manual overrides, discovery decisions and 48-query report are linked alongside this document for review.

Primary sources: [Gaston elementary](https://www.gaston.k12.nc.us/elementary), [middle](https://www.gaston.k12.nc.us/middle), [high](https://www.gaston.k12.nc.us/high), [Union directory](https://www.ucpsnc.org/about/contact-us), [CaroMont directory](https://caromonthealth.org/locations/), [CMS registry](https://npiregistry.cms.hhs.gov/). Individual records carry the address-specific evidence.
