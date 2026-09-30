// Publish reviewed mailing-business social links and truthful partial research passes.
import {readFile,writeFile} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
import {mailingArea,mailingAreas} from '../site/mailing-territory.js';
import {mailingCategories,mergeMailingCatalog} from '../site/mailing-model.js';
import {validateResearch} from '../site/research-model.js';
const root=new URL('../',import.meta.url),crm=new URL('../../spray-net-networking/data/',import.meta.url);
const read=async u=>JSON.parse(await readFile(u,'utf8'));
const d=await read(new URL('site/data/directory.json',root)),m=await read(new URL('site/data/mailing.json',root));
const s=await read(new URL('site/data/social.json',root)),research=await read(new URL('site/data/research.json',root));
const ev=await read(new URL('business-coverage-evidence-20260929.json',crm)),businessIds=await read(new URL('business-coverage-ids-20260929.json',crm));
let added=0;
for(const [index,id]of Object.entries(businessIds)){
 const pages=ev[Number(index)].pages.filter(p=>p.status===200);
 const recipient=m.recipients.find(r=>r.id===id);
 const sources=[...new Set([recipient.source,...pages.map(p=>p.url)])];
 const accounts=new Map();
 for(const p of pages)for(const raw of p.socialLinks){
  const a=accountUrl(raw);if(!a||/squarespace/.test(a.url))continue;
  accounts.set(a.url,{...a,evidence:'website_linked',scope:'business',source:p.url,notes:'Linked from the business website; profile activity has not been independently checked.'});
 }
 const row={companyId:id,checkedOn:'2026-09-29',status:'checked',notes:pages.length?'Business website reviewed. Missing platforms remain unverified.':'Business address verified through indexed official website; social links remain unresolved because direct retrieval was unavailable.',sources,accounts:[...accounts.values()]};
 const old=s.reviews.findIndex(r=>r.companyId===id);if(old>=0)s.reviews[old]=row;else s.reviews.push(row);
 added+=row.accounts.length;
}
const ids=await read(new URL('coverage-ids-20260929.json',crm));
const reviewed=new Set([...Object.values(ids),...Object.values(businessIds)]);
const catalog=mergeMailingCatalog(m.recipients,d.companies),groups=new Map();
for(const r of catalog.filter(r=>reviewed.has(r.id))){
 const area=mailingArea(r),key=area+'|'+r.category;
 if(!groups.has(key))groups.set(key,{area,category:r.category,rows:[]});groups.get(key).rows.push(r);
}
research.passes=research.passes.filter(p=>!p.id.startsWith('2026-09-29-coverage-'));
for(const [key,g]of groups){
 const sources=new Map();
 for(const r of g.rows){
  const c=d.companies.find(c=>c.id===r.id),url=r.source||c?.website;
  if(url)sources.set(url,{label:r.name.slice(0,200),url:url.replace(/^http:/,'https:')});
 }
 research.passes.push({id:'2026-09-29-coverage-'+key.replace('|','-'),area:g.area,category:g.category,searchedOn:'2026-09-29',sources:[...sources.values()],reviewedIds:g.rows.map(r=>r.id),
 unresolved:g.rows.filter(r=>r.status!=='published').map(r=>r.name+': Company identity researched; complete mailing address still needs review.'),
 notes:'Partial regional Maps/web discovery followed by business website research. These records were reviewed; this does not mean every business or every city/category search was covered. Service-area pages do not prove a local office.',
 nextAction:'Continue individual city/category searches, verify additional candidates and business contacts, resolve held identities, and review missing social accounts and visitor policies.'});
}
validateResearch(research,catalog,mailingCategories);validateSocial(s,socialCompanies(d,m));
await writeFile(new URL('site/data/research.json',root),JSON.stringify(research));
await writeFile(new URL('site/data/social.json',root),JSON.stringify(s));
// Research queue intentionally records unsearched segments separately from partial reviewed passes.
const categories={...mailingCategories};delete categories.other;
const queryTerms={kitchen:['interior designers','cabinet makers','countertop suppliers','countertop installers'],real_estate:['real estate agencies','local real estate brokerages'],property_management:['property management companies','HOA management companies','commercial property managers']};
const queue={schemaVersion:1,updatedOn:'2026-09-29',scope:'All configured territory research areas and business categories. Partial means evidence exists, not market completeness.',segments:mailingAreas.filter(a=>a.id!=='regional').flatMap(a=>Object.entries(categories).map(([category,label])=>{
 const passes=research.passes.filter(p=>p.area===a.id&&p.category===category);
 const queries=(queryTerms[category]||[label]).map(term=>term+' '+a.label+' '+a.state);
 return {area:a.id,city:a.label,state:a.state,category,label,status:passes.length?'partial':'not_searched',passes:passes.map(p=>p.id),nextQuery:queries[0],queries};
}))};
await writeFile(new URL('coverage-queue-20260929.json',crm),JSON.stringify(queue,null,2));
console.log(JSON.stringify({businessSocialLinks:added,researchSegments:groups.size,queuedSegments:queue.segments.length}));
