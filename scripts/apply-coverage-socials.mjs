// Apply reviewed website-linked profiles; never change private follow progress.
import {readFile,writeFile} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
const root=new URL('../',import.meta.url), crm=new URL('../../spray-net-networking/data/',import.meta.url);
const read=async u=>JSON.parse(await readFile(u,'utf8'));
const evidence=await read(new URL('coverage-evidence-20260929.json',crm));
const selection=await read(new URL('coverage-review-20260929.json',crm));
const ids=await read(new URL('coverage-ids-20260929.json',crm));
const data=await read(new URL('site/data/social.json',root));
const rejected=['inesarcentales','brickhousereno','delftbleuinteriors','nardotrealtor','wilkinson-virtual-inc','libertybellesc'];
let added=0,records=0;
for(const row of selection.filter(r=>r.status==='reviewed')){
 const companyId=ids[row.key];if(!companyId)throw Error('Missing imported company');
 const pages=evidence[row.index].pages.filter(p=>p.status===200);
 const old=data.reviews.find(r=>r.companyId===companyId);
 const sources=new Set(old?.sources||[]),accounts=new Map((old?.accounts||[]).map(a=>[a.url,a]));
 for(const page of pages){
  sources.add(page.url);
  for(const raw of page.socialLinks){
   const a=accountUrl(raw);if(!a||rejected.some(x=>a.url.toLowerCase().includes(x)))continue;
   // Facebook's two old KBN URLs identify the same page; use the numeric canonical form.
   if(a.url.includes('kbn-interiors-172422512795216'))continue;
   if(accounts.has(a.url))continue;
   const personal=/brianmcintosh52|david\.smith\.296624/.test(a.url);
   accounts.set(a.url,{...a,evidence:personal?'possible':'website_linked',scope:personal?'unclear':([20,75,76].includes(row.index)?'brand':'business'),source:page.url,
    notes:personal?'Linked by the business website, but appears to be a personal profile; confirm business use before following.':'Linked from the reviewed business website. Profile activity and availability have not been independently checked.'});added++;
  }
 }
 const updated={companyId,checkedOn:'2026-09-29',status:'checked',notes:'Public business website and available contact/about pages reviewed. Missing platforms remain unverified; no profile names were guessed.',sources:[...sources],accounts:[...accounts.values()]};
 if(old)data.reviews[data.reviews.indexOf(old)]=updated;else data.reviews.push(updated);
 records++;
}
data.publishedAt='2026-09-29';
const directory=await read(new URL('site/data/directory.json',root)),mailing=await read(new URL('site/data/mailing.json',root));
validateSocial(data,socialCompanies(directory,mailing));
await writeFile(new URL('site/data/social.json',root),JSON.stringify(data));
console.log(JSON.stringify({reviewedBusinesses:records,newAccountLinks:added,totalReviews:data.reviews.length}));
