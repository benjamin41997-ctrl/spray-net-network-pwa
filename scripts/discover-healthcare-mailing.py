"""Checkpointed, read-only CMS organization discovery. Produces candidates, never auto-publishes.

Usage: python scripts/discover-healthcare-mailing.py OUTPUT_DIRECTORY
Uses the free public NPPES API. Excludes individuals and personal contact fields.
"""
import json
import sys
import time
from pathlib import Path
import requests

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
territory = {'SC':['29708','29715','29707','29732','29730','29733','29710'],
             'NC':['28012','28032','28054','28056','28098','28101','28104','28173','28277','28278','28214','28134','28227','28079','28120','28052','28105']}
allowed_medical = {'261QM1300X','261QM2500X','261QP2300X','261QU0200X','261QR0200X','261QX0200X','261QA1903X','261QF0400X'}
report=[]; candidates={}
for state,zips in territory.items():
    for zipcode in zips:
        for category,taxonomy in [('dentist','Dentist'),('medical','Clinic/Center')]:
            key=f'{zipcode}-{category}'; checkpoint=out/(key+'.json')
            if checkpoint.exists():
                saved=json.loads(checkpoint.read_text(encoding='utf-8'))
            else:
                saved={'zip':zipcode,'state':state,'category':category,'reviewedOn':'2026-09-22','status':'complete_for_query','found':0,'candidates':[]}
                try:
                    for skip in range(0,1001,200):
                        params={'version':'2.1','enumeration_type':'NPI-2','taxonomy_description':taxonomy,'postal_code':zipcode,'state':state,'address_purpose':'LOCATION','limit':200,'skip':skip}
                        response=requests.get('https://npiregistry.cms.hhs.gov/api/',params=params,timeout=25);response.raise_for_status();data=response.json()
                        if data.get('Errors') or 'results' not in data and data.get('result_count')!=0:raise ValueError('Unexpected API response')
                        rows=data.get('results',[]);saved['found']+=len(rows)
                        for r in rows:
                            if r.get('enumeration_type')!='NPI-2' or r.get('basic',{}).get('status')!='A':continue
                            primary=[t['code'] for t in r.get('taxonomies',[]) if t.get('primary')]
                            if category=='dentist' and not any(code.startswith('1223') for code in primary):continue
                            if category=='medical' and not any(code in allowed_medical for code in primary):continue
                            addresses=[a for a in r.get('addresses',[]) if a.get('address_purpose')=='LOCATION' and a.get('country_code')=='US' and a.get('state')==state and a.get('postal_code','')[:5]==zipcode]
                            for a in addresses:
                                if not a.get('address_1') or not a.get('city'):continue
                                z=a['postal_code'];z=z[:5]+'-'+z[5:] if len(z)==9 else z
                                # Prefer the registered DBA; retain organization name when none is supplied.
                                dba=next((n.get('organization_name') for n in r.get('other_names',[]) if n.get('type')=='Doing Business As' and n.get('organization_name')),None)
                                saved['candidates'].append(dict(npi=str(r['number']),name=dba or r['basic']['organization_name'],legalName=r['basic']['organization_name'],category=category,address1=a['address_1'],address2=a.get('address_2',''),city=a['city'].title(),state=state,zip=z,source='https://npiregistry.cms.hhs.gov/api/?version=2.1&number='+str(r['number']),registryUpdatedOn=r['basic'].get('last_updated',''),taxonomy=primary))
                        time.sleep(1)
                        if len(rows)<200:break
                    else:saved['status']='query_limit_reached'
                except (requests.RequestException,ValueError,KeyError) as error:
                    saved['status']='blocked';saved['error']=type(error).__name__
                checkpoint.write_text(json.dumps(saved,indent=2),encoding='utf-8')
            report.append({k:v for k,v in saved.items() if k!='candidates'})
            for r in saved['candidates']:candidates[r['npi']+'|'+r['address1']+'|'+r['address2']]=r
            print(key,saved['status'],saved['found'],'found',len(saved['candidates']),'eligible',flush=True)
(out/'candidates.json').write_text(json.dumps(list(candidates.values()),indent=2),encoding='utf-8')
(out/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('TOTAL',len(candidates),flush=True)
