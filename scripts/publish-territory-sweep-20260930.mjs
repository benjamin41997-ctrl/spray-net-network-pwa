// Publish only the explicitly reviewed public source fields in the dated sweep.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {completeAddress,mergeMailingCatalog,mailingCategories} from '../site/mailing-model.js';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
import {buildNetwork} from '../site/business-model.js';
import {mailingArea} from '../site/mailing-territory.js';
import {validateResearch} from '../site/research-model.js';
const root=new URL('../',import.meta.url),base=new URL('../../spray-net-networking/data/sweep-20260930/',import.meta.url);
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
  const recipient={id,name:c?.name||r.name,category:c?.category||r.category,attention:'',address1:r.address1,address2:r.address2,city:r.city,state:r.state,zip:r.zip,country:'US',source:r.source,reviewedOn:'2026-09-30',status:'needs_review',addressSourceType:'company_website',exterior:{route:'unknown',reason:'Business identity/location researched. Property ownership and exterior approval authority remain unverified.',source:r.source,reviewedOn:'2026-09-30'}};
  if(completeAddress(recipient)){recipient.status='published';report.newAddresses++;}
  m.recipients.push(recipient);
  if(r.disposition==='new'&&!mapping[r.key]){if(c)report.newReferral++;else report.newBusiness++;}
 }
 mapping[r.key]=id;reviewed.add(id);
 if(id>=1000000){
  const old=byDetail.get(id)||{id,people:[],sources:[]},source={url:r.source,type:'company website',date:'2026-09-30'};
  const updated={...old,verified:'2026-09-30',sources:[...old.sources.filter(s=>s.url!==source.url),source]};
  for(const key of ['website','phone','email'])if(!old[key]&&r[key])updated[key]=r[key];
  byDetail.set(id,updated);
 }
 const pages=evidence.find(e=>e.website===r.website)?.pages.filter(p=>p.status===200)||[];
 const old=s.reviews.find(q=>q.companyId===id),accounts=new Map((old?.accounts||[]).map(a=>[a.url,a]));
 const sources=new Set([...(old?.sources||[]),r.source,...pages.map(p=>p.url)]);
 for(const p of pages)for(const link of p.socialLinks||[]){
  const a=accountUrl(link);if(!a||accounts.has(a.url))continue;
  if(excludedSocial.has(a.url)||/\/(?:@?(?:wix|squarespace|godaddy|godaddypro|weebly|wordpress|duda|snappages|elementor|webflow|google|facebook|instagram|youtube|twitter|linkedin)|company\/(?:wix(?:-com)?|squarespace|godaddy|duda|webflow)|137651866288234)$/i.test(a.url))continue;
  accounts.set(a.url,{...a,evidence:'website_linked',scope:'unclear',source:p.url,notes:'Linked by the reviewed business website. May be a shared brand account; local scope and recent activity are unverified.'});report.newSocialAssociations++;
 }
 const note='Public business website checked during the territory sweep. Missing platforms, named decision-makers and approval authority remain unknown.';
 const review={companyId:id,checkedOn:'2026-09-30',status:'checked',notes:old?.notes?old.notes:(note),sources:[...sources],accounts:[...accounts.values()]};
 if(old)s.reviews[s.reviews.indexOf(old)]=review;else s.reviews.push(review);
}
details.records=[...byDetail.values()].sort((a,b)=>a.id-b.id);s.publishedAt='2026-09-30';
const catalog=mergeMailingCatalog(m.recipients,d.companies),network=buildNetwork(d,m,details);
research.passes=research.passes.filter(p=>!p.id.startsWith('2026-09-30-sweep-'));
report.reclassifiedResearch=[];
const currentCatalog=new Map(catalog.map(r=>[r.id,r]));
for(const pass of research.passes){
 const moved=pass.reviewedIds.filter(id=>{const r=currentCatalog.get(id);return r&&(r.category!==pass.category||mailingArea(r)!==pass.area);});
 if(!moved.length)continue;
 pass.reviewedIds=pass.reviewedIds.filter(id=>!moved.includes(id));
 pass.unresolved.push('Location/category information updated on 2026-09-30 for previously reviewed IDs '+moved.join(', ')+'. Their review is retained in the new sweep under the current territory segment.');
 report.reclassifiedResearch.push({pass:pass.id,ids:moved});
}
for(const segment of ledger){
 const recipients=catalog.filter(r=>reviewed.has(r.id)&&mailingArea(r)===segment.area&&r.category===segment.category);
 research.passes.push({id:'2026-09-30-sweep-'+segment.id,area:segment.area,category:segment.category,searchedOn:'2026-09-30',sources:segment.queries.map(q=>({label:q,url:'https://www.google.com/search?q='+encodeURIComponent(q)})),reviewedIds:recipients.map(r=>r.id),unresolved:['Search results include unreviewed candidate pages, possible duplicates and inaccessible websites. See the dated sweep report for the complete review backlog.'],notes:`${segment.queries.length} public web queries searched for this city/category; results were compared against both directories. Reviewed records may be located in another territory city. Search performed does not mean every business was found or every result has been verified.`,nextAction:'Resolve remaining candidate identities and office conflicts; enrich contacts, email, socials, visitor policy and exterior approval authority.'});
}
validateResearch(research,catalog,mailingCategories);validateSocial(s,socialCompanies(d,m));
for(const [file,value]of [['mailing',m],['business-details',details],['social',s],['research',research]])await save(new URL('site/data/'+file+'.json',root),value);
await save(new URL('public-ids.json',base),mapping);
Object.assign(report,{referralRecords:d.companies.length,businessRecords:network.companies.filter(c=>c.audiences.includes('business')).length,distinctRecords:network.companies.length,publishedAddresses:m.recipients.filter(r=>r.status==='published').length,heldAddresses:m.recipients.filter(r=>r.status!=='published').length,distinctSocialUrls:new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url))).size,newDistinctSocialUrls:new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)).filter(u=>!oldUrls.has(u))).size});
await save(new URL('publication-report.json',base),report);console.log(JSON.stringify(report));
