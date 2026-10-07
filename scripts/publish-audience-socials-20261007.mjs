// Explicitly reviewed interest accounts; no follower/member data or platform actions.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies,audienceInterests} from '../site/social-model.js';
import {validateBusinessDetails,buildNetwork} from '../site/business-model.js';
import {mergeMailingCatalog,completeAddress} from '../site/mailing-model.js';
const base=new URL('../../spray-net-networking/data/audience-socials-20261007/',import.meta.url);
const data=new URL('../site/data/',import.meta.url);
const read=async(b,f)=>JSON.parse(await readFile(new URL(f,b),'utf8'));
const save=async(b,f,v)=>writeFile(new URL(f,b),JSON.stringify(v,null,2)+'\n');
const [d,m,b,s]=await Promise.all(['directory','mailing','business-details','social'].map(f=>read(data,f+'.json')));
const before=structuredClone({d,m,b,s});
const rows=await read(base,'reviewed-records.json');
await mkdir(new URL('before-publication/',base),{recursive:true});
for(const [name,value]of [['directory',d],['mailing',m],['business-details',b],['social',s]])await writeFile(new URL('before-publication/'+name+'.json',base),JSON.stringify(value,null,2)+'\n',{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
await save(base,'checkpoint.json',{status:'reviewed_publication_started',selected:28,reviewed:28,eligible:25,held:3,nextAction:'Publish reviewed rows once with stable mapping, test UI and deploy exact commit.'});
const mapping=await read(base,'public-ids.json').catch(()=>({}));
let next=Math.max(1000000,...m.recipients.map(r=>r.id))+1,newBusinesses=0,newAddresses=0,addedAccounts=0;
const oldUrls=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)));
const norm=n=>n.toLowerCase().replace(/[^a-z0-9]/g,'');
for(const r of rows){
 const exact=[...d.companies,...m.recipients].filter(c=>norm(c.name)===norm(r.name));
 const exactIds=[...new Set(exact.map(c=>c.id))];
 if(exactIds.length>1)throw Error('Ambiguous identity '+r.name);
 const id=r.matchedId||mapping[r.key]||exactIds[0]||next++;
 const prior=m.recipients.find(c=>c.id===id);
 if(!prior){
  const recipient={id,name:r.name,category:r.category,attention:'',address1:r.address1,address2:r.address2,city:r.city,state:r.state,zip:r.zip,country:'US',source:r.source,reviewedOn:'2026-10-07',status:'needs_review',addressSourceType:'company_website',prospectNotes:r.visitNote};
  if(completeAddress(recipient)){recipient.status='published';newAddresses++;}
  m.recipients.push(recipient);newBusinesses++;
 }
 mapping[r.key]=id;
 let detail=b.records.find(c=>c.id===id);
 if(!detail){detail={id,people:[],sources:[]};b.records.push(detail);}
 for(const k of ['website','email','phone'])if(!detail[k]&&r[k])detail[k]=r[k];
 detail.subcategory=r.groups.map(g=>audienceInterests[g]).join(' / ');
 if(!detail.services)detail.services=r.reason;
 if(!detail.sources.some(x=>x.url===r.source&&x.date==='2026-10-07'))detail.sources.push({url:r.source,type:'owned public website',date:'2026-10-07'});
 detail.verified='2026-10-07';
 if(!detail.visit||detail.visit.status==='unknown')detail.visit={status:r.visitStatus,summary:r.visitNote,address:null,hours:null,checkedAt:'2026-10-07',sources:[r.source]};
 let review=s.reviews.find(c=>c.companyId===id);
 if(!review){review={companyId:id,checkedOn:'2026-10-07',status:'checked',notes:'Public organization website reviewed. Profile availability and activity are not independently verified. No accounts followed.',sources:[],accounts:[]};s.reviews.push(review);}
 review.checkedOn='2026-10-07';review.audienceGroups=r.groups;review.audienceReason=r.reason;
 for(const source of [r.source,...r.accounts.map(a=>a.source)])if(!review.sources.includes(source))review.sources.push(source);
 for(const a of r.accounts){const normalized=accountUrl(a.url);if(!normalized)throw Error('Unapproved profile '+a.url);if(review.accounts.some(x=>x.url===normalized.url))continue;
  review.accounts.push({...normalized,evidence:'website_linked',scope:a.scope,source:a.source,notes:a.scope==='brand'?'National brand profile linked by the local location website; not a Cornelius-only account.':'Profile explicitly linked by the reviewed organization website. Check its current name and activity before following.'});addedAccounts++;
 }
 if(!review.accounts.length)review.notes='Public organization identity verified, but no owned-site-linked social account established in this pass. Use account search links or the public website; no handles guessed.';
}
// Existing identities and social objects are team progress keys.
for(const prior of before.m.recipients){const current=m.recipients.find(r=>r.id===prior.id);if(JSON.stringify(current)!==JSON.stringify(prior))throw Error('Existing mailing identity changed');}
for(const prior of before.s.reviews)for(const a of prior.accounts)if(!s.reviews.find(r=>r.companyId===prior.companyId)?.accounts.some(x=>JSON.stringify(x)===JSON.stringify(a)))throw Error('Existing social progress key/object changed');
for(const prior of before.b.records)for(const p of prior.people)if(!b.records.find(r=>r.id===prior.id)?.people.some(x=>JSON.stringify(x)===JSON.stringify(p)))throw Error('Existing person changed');
b.records.sort((a,b)=>a.id-b.id);s.publishedAt='2026-10-07';
mergeMailingCatalog(m.recipients,d.companies);validateBusinessDetails(b,m.recipients);validateSocial(s,socialCompanies(d,m));
const network=buildNetwork(d,m,b),urls=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)));
const report={reviewedOrganizations:28,suggestedOrganizations:25,newBusinesses,existingOrganizations:25-newBusinesses,newMailingAddresses:newAddresses,
 organizationsWithLinkedProfiles:rows.filter(r=>r.accounts.length).length,organizationsNeedingAccountResearch:rows.filter(r=>!r.accounts.length).length,
 newSocialAssociations:addedAccounts,newDistinctSocialProfiles:[...urls].filter(u=>!oldUrls.has(u)).length,heldOrganizations:3,
 distinctBusinesses:network.companies.length,mailingReady:m.recipients.filter(r=>r.status==='published').length,mailingHeld:m.recipients.filter(r=>r.status!=='published').length,
 distinctSocialProfiles:urls.size,placesApiRequests:0,stableExistingIdentitiesAndAccounts:true,
 interestCounts:Object.fromEntries(Object.keys(audienceInterests).map(g=>[g,rows.filter(r=>r.groups.includes(g)).length]))};
for(const [name,value]of [['mailing',m],['business-details',b],['social',s]])await save(data,name+'.json',value);
await save(base,'public-ids.json',mapping);await save(base,'publication-report.json',report);
await save(base,'checkpoint.json',{status:'published_locally_tests_pending',...report,nextAction:'Build and test the audience filter plus existing follow progress; commit and deploy; compare live payloads and filter code.'});
console.log(JSON.stringify(report));
