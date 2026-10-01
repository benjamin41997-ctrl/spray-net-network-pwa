import {readFile,writeFile} from 'node:fs/promises';
const base='../spray-net-networking/data/batch-20261001k/';
const m=JSON.parse(await readFile('site/data/mailing.json','utf8'));
for(const x of JSON.parse(await readFile(base+'public-address-updates.json','utf8'))){const r=m.recipients.find(r=>r.id===x.id);if(!r)throw Error('Missing '+x.id);Object.assign(r,x,{address2:'',status:'published',addressSourceType:'company_website',reviewedOn:'2026-10-01'});}
await writeFile('site/data/mailing.json',JSON.stringify(m,null,2)+'\n');



