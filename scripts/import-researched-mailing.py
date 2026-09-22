"""Import reviewed directory candidates; keep IDs stable and hold ambiguous registry identities.

Usage: python scripts/import-researched-mailing.py RESEARCH_DIRECTORY
Run after import-crm-mailing.py. The JSON candidates contain public business fields only.
"""
import collections
import json
import re
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; research=Path(sys.argv[1]); path=ROOT/'site/data/mailing.json'
data=json.loads(path.read_text(encoding='utf-8')); rows=data['recipients']; next_id=max(r['id'] for r in rows)+1
def norm(s):
    s=re.sub(r'[#]', ' STE ',s.upper());s=re.sub(r'[.,\-]', ' ',s)
    words={'STREET':'ST','ROAD':'RD','DRIVE':'DR','AVENUE':'AVE','BOULEVARD':'BLVD','LANE':'LN','HIGHWAY':'HWY','PARKWAY':'PKWY','SUITE':'STE','NORTH':'N','SOUTH':'S','EAST':'E','WEST':'W','CORPORATE':'CORP','PLACE':'PL'}
    s=re.sub(r'\b('+'|'.join(words)+r')\b',lambda m:words[m[0]],s)
    s=re.sub(r'\bSTE\s*(?=[A-Z0-9])','STE ',s)
    return re.sub(r'\s+',' ',s).strip()
def address_key(r):return (norm(r['address1']+' '+r.get('address2','')),r['state'],r['zip'][:5])
def name_key(name):
    value=re.sub(r'[^A-Z0-9 ]','',name.upper())
    return re.sub(r'\s+',' ',re.sub(r'\b(LLC|PLLC|PA|PC|INC|CORPORATION)\b','',value)).strip()
by_source={r['source']:r for r in rows if r['source'].startswith('https://npiregistry.')}
existing={(r['category'],address_key(r)) for r in rows if r['status']=='published'}
audit=[]
def exterior(r,route=None,reason=None,source=None):
    if not route:
        route='unknown';reason='Published business address only. Building ownership, exterior approval authority and walk-in access have not been established.'
        if re.search(r'\b(?:STE|SUITE|UNIT|FLOOR)\b|#',r['address1']+' '+r['address2'],re.I):
            route='likely_landlord';reason='Suite/unit address suggests a shared property. Landlord or association approval may be needed; tenancy and ownership are unverified.'
    return dict(route=route,reason=reason,source=source or r['source'],reviewedOn=r['reviewedOn'])
def add(c,kind,route=None,reason=None,notes='',held=False):
    global next_id
    if c.get('npi') and c['source'] in by_source:return
    key=(c['category'],address_key(c))
    if not held and key in existing:
        audit.append(dict(name=c['name'],source=c['source'],reason='Existing delivery address in category; retained existing record'));return
    if any(r['name']==c['name'] and r['source']==c['source'] and address_key(r)==address_key(c) for r in rows):return
    r={k:c[k].strip() for k in ['name','category','address1','address2','city','state','zip','source']}
    r.update(id=next_id,attention='',country='US',reviewedOn='2026-09-22',status='needs_review' if held else 'published',addressSourceType=kind,prospectNotes=notes)
    r['exterior']=exterior(r,route,reason);rows.append(r);next_id+=1
    if not held:existing.add(key)

for c in json.loads((research/'schools-candidates.json').read_text(encoding='utf-8')):
    c['address1']=' '.join(c['address1'].split())
    add(c,'official_directory','central_facilities','Public school listed by its district. Start with district facilities/procurement; a school office is not evidence of independent contracting authority.','School district directory reviewed September 22. Confirm vendor requirements and arrange any visit.')
for c in json.loads((research/'medical-candidates.json').read_text(encoding='utf-8')):
    if any(s in c['name'] for s in ['Regional Medical Center','Retail Pharmacy','Courtland Terrace']):
        audit.append(dict(name=c['name'],source=c['source'],reason='Hospital, pharmacy or residential care; outside medical-office scope'));continue
    c['address1']=' '.join(c['address1'].split())
    add(c,'official_directory','central_facilities','Listed in CaroMont Health\'s location directory. Start with the health system\'s facilities team; local practice staff may not authorize exterior work.','Health-system location; shared delivery addresses were consolidated. Different suites remain separate. Coating suitability and approval authority need confirmation.')

groups=collections.defaultdict(list)
for c in json.loads((research/'healthcare/candidates.json').read_text(encoding='utf-8')):groups[(c['category'],address_key(c))].append(c)
known_names={(name_key(r['name']),r['zip'][:5],r['address1'].split()[0]) for r in rows if r['status']=='published' and not r['source'].startswith('https://npiregistry.')}
for key,group in groups.items():
    group.sort(key=lambda c:c['registryUpdatedOn'],reverse=True);c=group[0]
    if (name_key(c['name']),c['zip'][:5],c['address1'].split()[0]) in known_names:
        audit.append(dict(name=c['name'],source=c['source'],reason='Existing business name and ZIP; retained independently reviewed record instead of registry address alias'));continue
    if key in existing:
        for item in group:audit.append(dict(name=item['name'],source=item['source'],reason='Existing delivery address in category; retained existing record'))
        continue
    ambiguous=len({name_key(item['name']) for item in group})>1
    limited=bool(re.search(r'TELEHEALTH|MANAGEMENT GROUP|INFRASTRUCTURE|CONNECT OF',c['name'],re.I))
    notes=f"CMS organization registry practice-location address (NPI {c['npi']}); registry record last updated {c['registryUpdatedOn'] or 'unknown'}. Current trading name, occupancy, postal deliverability and building ownership are not independently confirmed."
    if ambiguous:notes='Held: multiple organization names at this delivery address need current-practice confirmation. '+notes
    elif limited:notes='Held: possible virtual practice or administrative entity; physical office needs confirmation. '+notes
    add(c,'healthcare_registry',notes=notes,held=ambiguous or limited)
    for item in group[1:]:audit.append(dict(name=item['name'],source=item['source'],reason='Shared registry delivery address; represented once'+(' and held for identity review' if ambiguous else '')))

# Baseline qualifications are explicit inferences, never a declaration of property ownership.
for r in rows:
    if r['status']!='published' or r.get('exterior'):continue
    r['addressSourceType']=r.get('addressSourceType','company_website')
    if r['category'] in ['school','district']:
        r['exterior']=exterior(r,'central_facilities','Public school/district listing. Start with district facilities/procurement; confirm contracting authority and vendor requirements.')
    else:r['exterior']=exterior(r)
proofs={
  1000094:('https://www.redbarnwaxhaw.com/who-we-are','The venue describes operating on its family property. The business owner is a likely starting point; current deed ownership and signing authority are not verified.'),
  1000097:('https://hewillfarms.com/our-story','The operators describe renovating the barn at their family home into this venue. The operator is a likely exterior-project contact; verify current authority and arrange a visit.'),
  1000074:('https://www.mcleanfuneral.com/','The business describes itself as family owned and operated. Start with its owners/management; this does not prove ownership of the building.'),
  1000075:('https://www.mcleanfuneral.com/','The business describes itself as family owned and operated. Start with its owners/management; this does not prove ownership of the building.')
}
for r in rows:
    if r['id'] in proofs:
        source,reason=proofs[r['id']];r['exterior']=exterior(r,'likely_business',reason,source);r['exterior']['reviewedOn']='2026-09-22'

data['publishedAt']='2026-09-22'
data['coverage']='Expanded from official school and health-system directories, the CMS organization registry, and an evidence audit of all 557 CRM companies. Each published record has a source and its actual review date. Registry records are identified and may lag changes in trading name or occupancy. Ambiguous identities and conflicting or incomplete CRM evidence stay held. Counts measure collected addresses, not complete market coverage. Exterior routes are evidence-based research judgments, not deed or lease verification. Postal delivery, surface condition, coating suitability and permission to visit still need confirmation.'
path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(ROOT/'docs/mailing-discovery-review-2026-09-22.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print('CATALOG',dict(collections.Counter(r['status'] for r in rows)))
print('PUBLISHED CATEGORIES',dict(collections.Counter(r['category'] for r in rows if r['status']=='published')))
print('HELD REGISTRY',sum(r['status']=='needs_review' and r['source'].startswith('https://npiregistry.') for r in rows),'REVIEW DECISIONS',len(audit))
