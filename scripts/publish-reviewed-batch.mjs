// Publish only the explicitly reviewed public source fields in the dated sweep.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {completeAddress,mergeMailingCatalog,mailingCategories} from '../site/mailing-model.js';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
import {buildNetwork} from '../site/business-model.js';
import {mailingArea} from '../site/mailing-territory.js';
import {validateResearch} from '../site/research-model.js';
const reviewedOn=process.argv[3];if(!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn||''))throw Error('Usage: node scripts/publish-reviewed-batch.mjs BATCH_DIRECTORY YYYY-MM-DD');
const root=new URL('../',import.meta.url),base=pathToFileURL(resolve(process.argv[2])+'/');
const read=async u=>JSON.parse(await readFile(u,'utf8')),save=async(u,x)=>writeFile(u,JSON.stringify(x,null,2)+'\n');
const files=['directory','mailing','business-details','social','research'];
const [d,m,details,s,research]=await Promise.all(files.map(f=>read(new URL('site/data/'+f+'.json',root))));
await mkdir(new URL('before-publication/',base),{recursive:true});
for(let i=0;i<files.length;i++)await writeFile(new URL('before-publication/'+files[i]+'.json',base),JSON.stringify([d,m,details,s,research][i]),{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
const rows=await read(new URL('reviewed-records.json',base)),ids=await read(new URL('referral-ids.json',base)),evidence=await read(new URL('website-evidence.json',base));
const ledger=await read(new URL('ledger.json',base));
const mapping=await read(new URL('public-ids.json',base)).catch(()=>({}));
const byDetail=new Map(details.records.map(r=>[r.id,r]));let next=Math.max(1000000,...m.recipients.map(r=>r.id))+1;
const reviewed=new Set();const report={newReferral:0,newBusiness:0,newAddresses:0,newSocialAssociations:0,existing:0,held:[]};
const oldUrls=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)));
// Reviewed exclusions: website vendors, unrelated linked businesses, and out-of-area
// sister locations. A link appearing on a business website alone is insufficient.
const excludedSocial=new Set([
 'https://www.facebook.com/doorloopapp',
 'https://www.facebook.com/splendisheskitchen','https://www.instagram.com/shonalskitchen',
 'https://www.instagram.com/daintynails.llc','https://www.instagram.com/everbloom_counseling','https://www.instagram.com/laurenatreveriesalon',
 'https://www.facebook.com/asianrollandgrill','https://www.facebook.com/farmhaussc',
 'https://www.facebook.com/newhomebaptistchurchpisgah','https://www.facebook.com/rainsville-alabama-104107716293624',
 'https://www.facebook.com/rainsvillechamber','https://www.facebook.com/naccmustangs','https://www.facebook.com/profile.php?id=100089718404458',
 'https://www.facebook.com/maplespringsdentalmorganton','https://www.instagram.com/maplespringsdentalmorganton'
]);
for(const r of rows){
 if(r.disposition==='possible_duplicate'){report.held.push({name:r.name,key:r.key,reason:'Possible duplicate or office identity conflict'});continue;}
 const id=r.matchedId||ids[r.key]||mapping[r.key]||next++;
 const c=d.companies.find(c=>c.id===id);if(id<1000000&&!c)throw Error('Missing referral identity '+id);
 const prior=m.recipients.find(q=>q.id===id);if(r.disposition==='existing')report.existing++;
 if(!prior){
  const mailingSource=r.source.startsWith('https://')?r.source:'';
  const recipient={id,name:c?.name||r.name,category:c?.category||r.category,attention:'',address1:r.address1,address2:r.address2,city:r.city,state:r.state,zip:r.zip,country:'US',source:mailingSource,reviewedOn:reviewedOn,status:'needs_review',addressSourceType:'company_website'};
  // HTTP evidence remains in business details; do not invent an HTTPS route
  // or promote an explicitly held address to an exportable mailing record.
  if(mailingSource)recipient.exterior={route:'unknown',reason:'Business identity/location researched. Property ownership and exterior approval authority remain unverified.',source:mailingSource,reviewedOn:reviewedOn};
  if(completeAddress(recipient)&&mailingSource&&!r.mailingHold){recipient.status='published';report.newAddresses++;}
  m.recipients.push(recipient);
  if(r.disposition==='new'&&!mapping[r.key]){if(c)report.newReferral++;else report.newBusiness++;}
 }
 mapping[r.key]=id;reviewed.add(id);
 if(id>=1000000){
  const old=byDetail.get(id)||{id,people:[],sources:[]},source={url:r.source,type:'company website',date:reviewedOn};
  const updated={...old,verified:reviewedOn,sources:[...old.sources.filter(s=>s.url!==source.url),source]};
  for(const key of ['website','phone','email'])if(!old[key]&&r[key])updated[key]=r[key];
  byDetail.set(id,updated);
 }
 // Social associations are reviewed separately; do not infer account ownership from page links.
 if(id>=1000000&&r.subcategory)byDetail.get(id).subcategory=r.subcategory;

}
details.records=[...byDetail.values()].sort((a,b)=>a.id-b.id);
const catalog=mergeMailingCatalog(m.recipients,d.companies),network=buildNetwork(d,m,details);
report.reclassifiedResearch=[];
const currentCatalog=new Map(catalog.map(r=>[r.id,r]));
for(const pass of research.passes){
 const moved=pass.reviewedIds.filter(id=>{const r=currentCatalog.get(id);return r&&(r.category!==pass.category||mailingArea(r)!==pass.area);});
 if(!moved.length)continue;
 pass.reviewedIds=pass.reviewedIds.filter(id=>!moved.includes(id));
 pass.unresolved.push('Location/category corrected on '+reviewedOn+' for IDs '+moved.join(', ')+'. Refer to their current company profiles; the prior segment does not represent a separate office.');
 report.reclassifiedResearch.push({pass:pass.id,ids:moved});
}
validateResearch(research,catalog,mailingCategories);validateSocial(s,socialCompanies(d,m));
for(const [file,value]of [['mailing',m],['business-details',details],['social',s],['research',research]])await save(new URL('site/data/'+file+'.json',root),value);
await save(new URL('public-ids.json',base),mapping);
Object.assign(report,{referralRecords:d.companies.length,businessRecords:network.companies.filter(c=>c.audiences.includes('business')).length,distinctRecords:network.companies.length,publishedAddresses:m.recipients.filter(r=>r.status==='published').length,heldAddresses:m.recipients.filter(r=>r.status!=='published').length,distinctSocialUrls:new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url))).size,newDistinctSocialUrls:new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)).filter(u=>!oldUrls.has(u))).size});
await save(new URL('publication-report.json',base),report);console.log(JSON.stringify(report));
