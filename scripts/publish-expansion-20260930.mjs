// Publish reviewed public fields, retaining existing identities and private-history keys.
import {readFile,writeFile} from 'node:fs/promises';
import {addressKey,completeAddress,mergeMailingCatalog,mailingCategories} from '../site/mailing-model.js';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
import {buildNetwork} from '../site/business-model.js';
import {mailingArea,mailingAreas} from '../site/mailing-territory.js';
import {validateResearch} from '../site/research-model.js';
const root=new URL('../',import.meta.url),crm=new URL('../../spray-net-networking/data/',import.meta.url);
const read=async u=>JSON.parse(await readFile(u,'utf8')),save=async(u,v)=>writeFile(u,JSON.stringify(v,null,2)+'\n');
const d=await read(new URL('site/data/directory.json',root)),m=await read(new URL('site/data/mailing.json',root)),s=await read(new URL('site/data/social.json',root));
const details=await read(new URL('site/data/business-details.json',root)),byDetail=new Map(details.records.map(r=>[r.id,r]));
const rows=await read(new URL('expansion-reviewed-20260930.json',crm)),evidence=await read(new URL('coverage-evidence-20260930.json',crm)),ids=await read(new URL('expansion-ids-20260930.json',crm));
const registry=await read(new URL('business-registry-evidence-20260930.json',crm));
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
let registryPhones=0,registryPeople=0;const held=[];
for(const result of registry){
 const r=m.recipients.find(r=>r.id===result.id),items=result.data?.results;
 if(!r||items?.length!==1){held.push({id:result.id,reason:'Registry identity unavailable'});continue;}
 const item=items[0],b=item.basic,names=[b.organization_name,...(item.other_names||[]).map(n=>n.organization_name)];
 const addresses=(item.addresses||[]).filter(a=>a.address_purpose==='LOCATION');
 const address=addresses.find(a=>addressKey({address1:a.address_1,address2:a.address_2||'',city:a.city,state:a.state,zip:a.postal_code})===addressKey(r));
 if(item.enumeration_type!=='NPI-2'||b.status!=='A'||!names.some(n=>norm(n)===norm(r.name))||!address){held.push({id:r.id,reason:'Current registry identity/location requires review; no contacts imported'});continue;}
 const sources=[{url:result.source,type:'CMS organization registry; last updated '+b.last_updated,date:'2026-09-30'}];
 const detail=byDetail.get(r.id)||{id:r.id,people:[],sources:[]};
 const phone=(address.telephone_number||'').replace(/\D/g,'');
 if(phone.length===10&&!detail.phone){detail.phone=phone;registryPhones++;}
 if(b.authorized_official_first_name&&b.authorized_official_last_name&&!detail.people.some(p=>p.id===r.id*100+1)){
  const name=[b.authorized_official_first_name,b.authorized_official_middle_name,b.authorized_official_last_name].filter(Boolean).join(' ');
  detail.people.push({id:r.id*100+1,name,role:'Registry authorized official'+(b.authorized_official_title_or_position?' — '+b.authorized_official_title_or_position:'')+' (exterior approval authority unverified)',email:'',phone:'',sources});registryPeople++;
 }
 detail.sources=[...detail.sources.filter(x=>x.url!==result.source),...sources];detail.verified='2026-09-30';byDetail.set(r.id,detail);
}
const matched={36:1000289,42:1000108,43:1000106,44:1000547,45:1000550,46:1000069,48:1000070};
const mappings=await read(new URL('expansion-public-ids-20260930.json',crm)).catch(()=>({}));
let next=Math.max(...m.recipients.map(r=>r.id),1000000)+1,newBusiness=0,newAddresses=0,newLinks=0;
const reviewedIds=new Set(),unavailable=[];
for(const row of rows){
 const referral=Object.hasOwn(ids,row.key),id=referral?ids[row.key]:(mappings[row.key]||matched[row.index]||next++);
 mappings[row.key]=id;reviewedIds.add(id);
 const company=d.companies.find(c=>c.id===id),old=m.recipients.find(r=>r.id===id);
 let recipient=old;
 if(!old){
  recipient={id,name:company?.name||row.name,category:company?.category||row.category,attention:'',address1:row.address1,address2:row.address2,city:row.city,state:row.state,zip:row.zip,country:'US',source:row.website,reviewedOn:'2026-09-30',status:'needs_review',addressSourceType:'company_website',exterior:{route:'unknown',reason:'Business location established; ownership and authority to approve exterior work have not been verified.',source:row.website,reviewedOn:'2026-09-30'}};
  if(completeAddress(recipient)){recipient.status='published';newAddresses++;}
  m.recipients.push(recipient);if(!referral)newBusiness++;
 }
 if(!referral){
  const previous=byDetail.get(id)||{id,people:[],sources:[]},source={url:row.website,type:'company website',date:'2026-09-30'};
  byDetail.set(id,{...previous,website:row.website,...(row.email?{email:row.email}:{}),...(row.phone?{phone:row.phone}:{}),services:row.subcategory+'.',subcategory:row.subcategory,verified:'2026-09-30',sources:[...previous.sources.filter(x=>x.url!==row.website),source],people:[...previous.people,...row.people.map((p,j)=>({id:id*100+10+j,name:p.name,role:p.role,email:'',phone:'',sources:[source]})).filter(p=>!previous.people.some(q=>q.id===p.id))]});
 }
 const raw=evidence.find(e=>e.name===row.name),pages=(raw?.pages||[]).filter(p=>p.status===200),prior=s.reviews.find(r=>r.companyId===id);
 const sources=new Set([...(prior?.sources||[]),row.website]),accounts=new Map((prior?.accounts||[]).map(a=>[a.url,a]));
 for(const page of pages){sources.add(page.url);for(const rawLink of page.socialLinks){
  const a=accountUrl(rawLink);if(!a||/\/(?:@?wix|squarespace)$/.test(a.url)||a.url.endsWith('137651866288234')||accounts.has(a.url))continue;
  accounts.set(a.url,{...a,evidence:'website_linked',scope:[7,8,9,10,11,15,16,17,40,41].includes(row.index)?'brand':'business',source:page.url,notes:'Linked by the official business website. Account activity is unverified.'});newLinks++;
 }}
 const review={companyId:id,checkedOn:'2026-09-30',status:pages.length?'checked':'blocked',notes:pages.length?'Official website reviewed. Missing platforms remain unknown.':'Official indexed page supplied business fields; direct website retrieval was unavailable, so social research remains pending.',sources:[...sources],accounts:[...accounts.values()]};
 if(prior)s.reviews[s.reviews.indexOf(prior)]=review;else s.reviews.push(review);
 if(!pages.length)unavailable.push({id,name:row.name,website:row.website,reason:raw?.pages?.[0]?.status||'unavailable'});
}
details.records=[...byDetail.values()].sort((a,b)=>a.id-b.id);s.publishedAt='2026-09-30';
const network=buildNetwork(d,m,details),catalog=mergeMailingCatalog(m.recipients,d.companies);
const research=await read(new URL('site/data/research.json',root));research.passes=research.passes.filter(p=>!p.id.startsWith('2026-09-30-expansion-'));
const groups=new Map();for(const r of catalog.filter(r=>reviewedIds.has(r.id))){const key=mailingArea(r)+'|'+r.category;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
for(const [key,rs]of groups){const [area,category]=key.split('|');research.passes.push({id:'2026-09-30-expansion-'+area+'-'+category,area,category,searchedOn:'2026-09-30',sources:rs.map(r=>({label:r.name,url:r.source||d.companies.find(c=>c.id===r.id).website})),reviewedIds:rs.map(r=>r.id),unresolved:rs.filter(r=>r.status!=='published').map(r=>r.name+': mailing address needs research.'),notes:'Partial category and city web searches followed by official website review. Existing records were matched before import. This is not complete market coverage.',nextAction:'Continue individual city/category discovery; research missing contacts, social accounts, visitor policies and approval authority.'});}
validateResearch(research,catalog,mailingCategories);validateSocial(s,socialCompanies(d,m));
await save(new URL('site/data/mailing.json',root),m);await save(new URL('site/data/social.json',root),s);await save(new URL('site/data/business-details.json',root),details);await save(new URL('site/data/research.json',root),research);await save(new URL('expansion-public-ids-20260930.json',crm),mappings);
const report={newBusiness,newAddresses,newLinks,registryPhones,registryPeople,heldRegistry:held,unavailableWebsites:unavailable,referrals:d.companies.length,businesses:network.companies.filter(c=>c.audiences.includes('business')).length};
await save(new URL('expansion-report-20260930.json',crm),report);
const queries={kitchen:['interior designers','cabinet manufacturers','cabinet showrooms','countertop installers','countertop showrooms'],flooring:['tile installers','flooring contractors','tile showrooms','flooring showrooms'],real_estate:['real estate brokerages','real estate teams','realtors'],property_management:['residential property managers','commercial property managers','HOA management'],retail:['jewelers','furniture showrooms','boutiques','specialty shops']};
await save(new URL('coverage-queue-20260930.json',crm),{updatedOn:'2026-09-30',note:'A partial pass is not an exhaustive search. Missing details stay unresolved. This is a work queue, not a scheduled process.',segments:mailingAreas.filter(a=>a.id!=='regional').flatMap(a=>Object.entries(mailingCategories).filter(([k])=>k!=='other').map(([category,label])=>({area:a.id,category,audiences:category==='property_management'?['referral','business']:['kitchen','real_estate','flooring'].includes(category)?['referral']:['business'],queries:(queries[category]||[label]).map(q=>q+' '+a.label+' '+a.state),status:research.passes.some(p=>p.area===a.id&&p.category===category)?'partial':'not_searched'})))});
console.log(JSON.stringify({...report,heldRegistry:held.length,unavailableWebsites:unavailable.length}));
