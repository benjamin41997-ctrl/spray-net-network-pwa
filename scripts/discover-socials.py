"""Read known public business websites; emit candidates for human review, never publish.
Usage: python scripts/discover-socials.py OUTPUT.json
"""
import concurrent.futures, datetime, json, sys
from pathlib import Path
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parent.parent
directory = json.loads((root/'site/data/directory.json').read_text(encoding='utf-8'))
mailing = json.loads((root/'site/data/mailing.json').read_text(encoding='utf-8'))
companies = {c['id']: c for c in directory['companies']}
jobs = {}
for c in directory['companies'] + mailing['recipients']:
    source = c.get('website') or (c.get('source') if c.get('addressSourceType') == 'company_website' else '')
    if not source or urlparse(source).scheme not in ('http', 'https'): continue
    jobs.setdefault(source, {})[c['id']] = c['name']

def check(item):
    url, businesses = item
    result = {'source': url, 'businesses': businesses, 'checkedOn': datetime.date.today().isoformat(), 'links': []}
    try:
        r = requests.get(url, timeout=18, headers={'User-Agent':'Mozilla/5.0 (compatible; BusinessDirectoryResearch/1.0)'})
        result.update(status=r.status_code, finalUrl=r.url)
        if r.status_code != 200: return result
        soup = BeautifulSoup(r.content, 'html.parser')
        links = {urljoin(r.url, a['href']) for a in soup.select('a[href]')}
        def same_as(value):
            if isinstance(value, dict):
                v = value.get('sameAs', [])
                links.update([v] if isinstance(v, str) else [x for x in v if isinstance(x, str)] if isinstance(v, list) else [])
                for child in value.values(): same_as(child)
            elif isinstance(value, list):
                for child in value: same_as(child)
        for s in soup.select('script[type="application/ld+json"]'):
            try: same_as(json.loads(s.string or s.get_text()))
            except (ValueError, TypeError): pass
        domains = ['instagram.com','facebook.com','tiktok.com','linkedin.com','youtube.com','youtu.be']
        result['links'] = sorted(u for u in links if any((urlparse(u).hostname or '').lower() == h or (urlparse(u).hostname or '').lower().endswith('.'+h) for h in domains))
    except requests.RequestException as e: result['error'] = type(e).__name__
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, jobs.items()))
out = Path(sys.argv[1]); out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'pages':len(results),'withLinks':sum(bool(r['links']) for r in results),'failed':sum(r.get('status')!=200 for r in results)}))
