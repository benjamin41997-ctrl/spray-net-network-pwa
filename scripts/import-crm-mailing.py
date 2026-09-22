"""Read-only CRM evidence audit; preserve company IDs in the PWA mailing catalog.

Run with the existing CRM Python interpreter and the path to networking.db.
No API calls, secrets, contact records or unreviewed addresses are exported.
"""
import collections
import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
catalog_path = ROOT / 'site/data/mailing.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
directory = json.loads((ROOT / 'site/data/directory.json').read_text(encoding='utf-8'))
db = sqlite3.connect(Path(sys.argv[1]).resolve().as_uri() + '?mode=ro', uri=True)
db.row_factory = sqlite3.Row
fields = ['street_address', 'city', 'state', 'zip']
records, audit = [], []
for company in directory['companies']:
    row = db.execute('select * from companies where company_id=?', (company['id'],)).fetchone()
    reasons, evidence = [], {}
    if not row:
        reasons.append('CRM record unavailable')
    else:
        meta = json.loads(row['field_meta'] or '{}')
        for field in fields:
            if not row[field]:
                reasons.append('Missing ' + field)
                continue
            source = db.execute('select * from sources where source_id=?', (meta.get(field, {}).get('source_id'),)).fetchone()
            if not source or not source['accepted'] or source['company_id'] != company['id'] or source['field_name'] != field or json.loads(source['observed_value']) != row[field]:
                reasons.append('Evidence mismatch: ' + field)
            elif not (source['source_url'] or '').startswith('https://'):
                reasons.append('Public HTTPS evidence needed: ' + field)
            elif source['source_type'] not in ['company_website', 'licensing', 'industry_association']:
                reasons.append('Unsupported source: ' + field)
            else:
                evidence[field] = dict(source)
        if row['zip'] and not re.fullmatch(r'\d{5}(?:-\d{4})?', row['zip']):
            reasons.append('ZIP needs review')
        if row['state'] and row['state'] not in ['NC', 'SC']:
            reasons.append('State outside NC/SC')
        if db.execute("select 1 from conflicts where company_id=? and status='pending' and field_name in ('street_address','city','state','zip')", (company['id'],)).fetchone():
            reasons.append('Unresolved address conflict')
    r = dict(id=company['id'], name=company['name'], category=company['category'], attention='', address1='', address2='', city=company['city'] or '', state=company['state'] or '', zip=company['zip'] or '', country='US', source='', reviewedOn='', status='needs_review')
    if reasons:
        r['prospectNotes'] = 'Held: ' + '; '.join(reasons) + '. No address has been guessed.'
    else:
        source = evidence['street_address']
        # Do not parse ambiguous street/unit strings. Preserve the reviewed delivery line verbatim.
        r.update(address1=row['street_address'], city=row['city'], state=row['state'], zip=row['zip'], source=source['source_url'], reviewedOn=source['retrieved_at'][:10], status='published', addressSourceType=source['source_type'])
        route, reason = 'unknown', 'The source establishes a business mailing address, not property ownership or exterior approval authority.'
        if re.search(r'\b(?:suite|ste|unit|floor)\b', r['address1'], re.I):
            route, reason = 'likely_landlord', 'A suite/unit/floor is listed. A landlord or association may control exterior work; this is an inference, not verified tenancy or ownership.'
        if re.search(r'\bP\.?\s*O\.?\s*Box\b|\bPMB\b|\bBox\s+\d', r['address1'], re.I):
            route, reason = 'unknown', 'A mailing box is listed. This does not identify the building to paint or the person authorized to approve exterior work.'
        r['exterior'] = dict(route=route, reason=reason, source=r['source'], reviewedOn=r['reviewedOn'])
        r['prospectNotes'] = ('Public business-license address; it may be a home, mailbox or appointment-only office. Confirm access and the appropriate project contact.' if source['source_type']=='licensing' else 'Existing CRM address with accepted source evidence. Confirm access and current delivery details before mailing or visiting.')
    records.append(r)
    audit.append(dict(id=r['id'], name=r['name'], status=r['status'], reasons=reasons))
catalog['recipients'] = [r for r in catalog['recipients'] if r['id'] >= 1000000] + records
# Later website checks can resolve a PWA mailing address without silently changing local CRM conflicts.
overrides_path = ROOT / 'docs/crm-mailing-overrides-2026-09-22.json'
if overrides_path.exists():
    overrides = {r['id']:r for r in json.loads(overrides_path.read_text(encoding='utf-8'))}
    catalog['recipients'] = [overrides.get(r['id'],r) for r in catalog['recipients']]
catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
report = dict(reviewedOn='2026-09-22', total=len(records), published=sum(r['status']=='published' for r in records), held=sum(r['status']!='published' for r in records), records=audit)
(ROOT / 'docs/crm-mailing-audit-2026-09-22.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='records'}))
print('Held reasons:', dict(collections.Counter(reason for r in audit for reason in r['reasons'])))
