import {readFile,writeFile} from 'node:fs/promises';
const base='../spray-net-networking/data/batch-20261001o/';
const m=JSON.parse(await readFile('site/data/mailing.json','utf8'));
for(const x of JSON.parse(await readFile(base+'public-address-updates.json','utf8'))){const r=m.recipients.find(r=>r.id===x.id);if(!r)throw Error('Missing '+x.id);Object.assign(r,x,{address2:'',status:'published',addressSourceType:'company_website',reviewedOn:'2026-10-01'});}
await writeFile('site/data/mailing.json',JSON.stringify(m,null,2)+'\n');





const details=JSON.parse(await readFile('site/data/business-details.json','utf8'));
const profile=details.records.find(r=>r.id===1001390);if(!profile)throw Error('Missing DRE business profile');
profile.website='https://www.dremedspa.com/';
if(!profile.sources.some(s=>s.url===profile.website))profile.sources.push({url:profile.website,type:'company website',date:'2026-10-01'});
await writeFile('site/data/business-details.json',JSON.stringify(details,null,2)+'\n');
