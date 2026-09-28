# Social discovery and follow queue — September 28, 2026

Social Links combines the networking directory and mailing catalog by stable company ID. It offers city, business type, platform, Priority 30, research and private progress filters, paginated results, business-detail links and a direct profile link for each researched account. Unresearched businesses have targeted platform searches; search results are not automatically accepted as matches.

## Source pass

Checked 248 distinct known website URLs from 152 networking-company website fields and eligible mailing address sources. One page may cover multiple businesses or offices. Public HTML anchors and structured `sameAs` links were extracted, then reviewed. The pass recorded 303 business research records; 170 businesses have at least one retained account. The directory has 1,116 combined business records, so social coverage is partial.

There are **377 distinct retained profile URLs**: 147 Facebook, 122 Instagram, 56 LinkedIn and 42 YouTube links, plus 10 TikTok links. Of those, 348 are website-linked and 29 are possible/ambiguous matches. These are URLs, not guaranteed unique underlying accounts: old aliases and renamed accounts may still refer to the same account. Canonical identical URLs share manual progress across offices. No claim is made about last-post date, follower counts, profile availability or current platform ownership.

Website-linked means the known business website links the profile. It is stronger association evidence than a name-only search result, but it is not a platform verification badge or proof the account remains active. A number of websites link multiple profiles on the same platform; these are marked possible pending review. Shared organization/brand accounts are explicitly labeled. Parent-brand accounts are useful for visibility but are not necessarily local decision-makers.

Excluded generic social homepages, share dialogs, content links, individual LinkedIn profiles and unrelated links. Fort Mill and Rock Hill district profiles are recorded under their district entities, not repeated as individual school accounts. Field of Dreams' Baxter and Edgewater profiles were assigned to the matching location. Old Bottle Tree links were excluded from Kaya. Skyline Cabinetry's link was withheld from Spring Forest because the business relationship was unresolved. Hanks' personal Facebook link was excluded. Ambiguous aliases for C.S. Brown, MINT, Lando, Meraki, Henderson and others remain visibly possible.

Hawthorne's LinkedIn company page was found by targeted web search and lists its business website and Charlotte location. It remains a possible match because a link from the business website was not found. Several Priority 30 businesses still need deeper social research, including First Choice, Rent Now, HomeRiver Charlotte, BuildNow and Completely Personal Homes.

## Roadblocks

33 source pages failed to return a usable HTTP 200 response. Most returned 403; three had certificate errors, three had connection errors, LPT returned 218 and Infinite Medical Spa returned 401. No challenge or certificate check was bypassed. Affected examples include Rinehart Realty, Alair, New Town Dentistry, Magnolia Medical Aesthetics, Pennington, 521 BBQ, Blood Law, McLean and Creative Kids. Their records retain the source and show unresolved research rather than claiming there is no account. The social sites themselves may also require login to inspect or follow a profile.

Plugin-directory discovery found marketing publishing and analytics integrations but no advertised bulk-follow capability. No plugin was installed or connected. The quick-link workflow does not need an integration. Following from a specific business account remains an action on the social platform. No accounts were followed and no messages were sent in this task.

## Private progress

Choose a **Your social profile label**, open the social profile, follow from the intended account, and then select **I followed this account**. Opening a profile never records a follow. Skip and reset-to-pending are manual states too. Shared profile URLs share state for the same label, while different labels keep independent progress. The label is a private tracking name, not authentication. It is remembered locally; existing labels are suggested on the input.

Records are stored in IndexedDB `spray-net-social-progress`. They are not public, automatically synchronized, or counted as completed networking contact. Export/import a **Social Links backup** separately from Tracker or mailing backups. Import validates the whole file before writing and keeps the newest timestamp per label/profile URL. A pending record is preserved so an old backup cannot resurrect an older followed state. Browser data removal can erase progress. If storage is unavailable, the app disables recording and does not present filtered accounts as known-unfollowed.

## Repeatable research

Run `python scripts/discover-socials.py <private-output.json>` using the sibling CRM's Python environment (requests and BeautifulSoup). It fetches known website URLs with bounded concurrency and timeouts, producing candidates only. Keep this raw response outside the published site.

Review account identity, local versus brand scope, obsolete names and embedded provider links. Update `site/data/social.json` only after review. Each account includes platform, canonical URL, evidence level, scope, source and notes; each business review includes date, sources and research outcome. Do not invent handles or infer account absence from an empty extraction. For unresolved businesses, use the generated targeted searches and corroborate name, website and location.

Build validates company IDs, account URL patterns, evidence and sources. Service-worker caching includes the social research and page for offline browsing; external profile/search links need connectivity. Tests cover safe URLs, filters, link-opening versus following, shared accounts, separate profile labels, backup transfer, offline persistence and unavailable storage.
