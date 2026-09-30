# Territory discovery and publication — September 30, 2026

Added **435 distinct business/location records**: **120 referral partners** and **315 direct-business prospects**. Property managers also appear in the Business Directory under the same identity, so directory totals overlap.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Referral Network | 669 | 789 | +120 |
| Business Directory (including shared property managers) | 650 | 984 | +334 |
| Distinct identities across both directories | 1,254 | 1,689 | +435 |
| Published mailing addresses | 920 | 1,347 | +427 |
| Persisted addresses held for review | 259 | 273 | +14 |
| Distinct social-account URLs | 570 | 1,347 | +777 |

The 435 new records include 435 websites, 383 published phone numbers, 132 published email addresses, and 337 records with at least one website-linked social account. Missing fields remain unknown. Named-contact and exterior-approval research is still pending for much of the directory.

## Search and review accounting

- **660 discovery queries** across **20 territory areas × 18 categories = 360 segments**, plus two supplemental identity-check queries.
- **8,649 result appearances / 6,445 distinct result URLs**. These are web pages, not counts of businesses. Repeated service-area pages, directories, reference material and irrelevant results are included.
- **1,898 candidate source URLs checked**, with **4,096 page attempts**, including contact/about pages. **255 candidate URLs** had no successful page response.
- **509 business/location records explicitly reviewed**: **435 new**, **68 existing matches**, **6 held for identity/address resolution**.
- **1,414 fetched source candidates remain outside the explicit review allowlist**. Some are irrelevant, repeated locations, existing companies or non-business references; this is not a count of missing businesses. The remaining result-URL queue is also saved locally for continuation.

This was a public web-search pass followed by business-website checks. It was **not a paginated Google Maps inventory**, and no Google Places API discovery ran in this pass. Query links in the app reproduce the search terms. A searched segment does not mean every business was found or every result was verified.

Areas searched: Fort Mill, Tega Cay, Rock Hill, Indian Land, Lake Wylie/Clover, Ballantyne, Charlotte, Pineville, Matthews, Mint Hill, Waxhaw, Weddington, Marvin, Indian Trail, Belmont, Mount Holly, Gastonia, Cramerton, McAdenville and Lowell. Verified nearby regional offices returned by these searches were retained as regional records.

## New records by category

| Category | New distinct locations |
| --- | ---: |
| Cabinets, countertops, interior design / remodeling | 30 |
| Flooring / tile | 43 |
| Real estate | 28 |
| Property / HOA management | 19 |
| Childcare / preschools | 35 |
| Churches | 24 |
| Dental offices | 30 |
| Med spas | 23 |
| Medical offices | 21 |
| Professional offices | 61 |
| Retail / shops | 21 |
| Veterinary | 25 |
| Lodging | 7 |
| Restaurants | 43 |
| Venues | 14 |
| Funeral homes | 9 |
| Schools | 2 |
| School districts | 0 |

Zero additions means this review did not establish a new publishable identity in that category; it is not a completeness claim. Existing schools and districts already account for many matches in those searches.

## Address and social safeguards

Of the new businesses, 421 have complete reviewed mailing addresses and 14 have held addresses. Six existing referral records gained a mailing row, producing 427 additional published addresses overall. A published business-site address is not a postal deliverability certification or permission to visit.

Existing mailing records, IDs, names, categories, social URLs, account evidence and social research notes were preserved. Fourteen existing referral records received missing public information. Twenty existing direct-business records gained details, alongside the 315 newly added businesses. Private team data, login configuration and follow tracking were not changed.

Social URLs were taken from linked business pages. Website-vendor links, Facebook policy/photo links, and reviewed unrelated partner links were excluded. New account associations retain an **unclear scope** label where they may belong to a shared brand, staff member or another office. Recent account activity has not been verified. Follow history uses the existing canonical URL keys.

New exterior-approval authority and visit suitability remain **unknown** unless previously researched; an office address is not treated as a walk-in invitation. Conflicting or absent street information, including All Pro Floors, The Britton Flooring Company and Kuester Commercial, does not prevent publishing a supported business identity, but its address remains held.

## Unresolved identities and access limits

Held from this import:

- The Linda Hall Team - Century 21 First Choice
- Dream Team United
- Armstead Realty Group
- Fowler Property Advisors
- MillBridge Dentistry
- The Home Team

These include shared-office teams, multiple possible legacy matches, an office-change conflict and the MillBridge street-number conflict. The verified Coldwell Banker Ballantyne branch was preserved separately; unlocated legacy ID 67 still needs an office comparison.

The 255 unavailable candidate URLs need an alternate public source or a later retry. No login, CAPTCHA or access restriction was bypassed. The source queue distinguishes unsuccessful website checks from verified businesses with incomplete fields.

## Continuation and audit

The [machine-readable audit](territory-sweep-2026-09-30.json) contains all 360 query segments, reviewed location decisions, public IDs and counts. Local research checkpoints retain the raw evidence, 6,445-URL review queue, 1,414-source fetched-candidate queue, unavailable sources, explicit decisions and import mappings. Raw website text is not published with this report.

Next review work: resolve the held identities and incomplete addresses; work through unreviewed source candidates and alternate sources for unavailable pages; then deepen published contacts, socials, visit policy and decision-maker authority. Recheck high-result city/category segments with dedicated Maps/Places searches to find businesses absent from ordinary web results. Coverage remains partial.
