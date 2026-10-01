import {readFile,writeFile} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
import {completeAddress} from '../site/mailing-model.js';
const base=new URL('../../spray-net-networking/data/batch-20261001f/',import.meta.url),pub=new URL('../site/data/',import.meta.url);
const read=async(b,n)=>JSON.parse(await readFile(new URL(n+'.json',b),'utf8'));
const save=async(b,n,v)=>writeFile(new URL(n+'.json',b),JSON.stringify(v,null,2)+'\n');
const [rows,ids,p,d,m,s,details,updates]=await Promise.all([read(base,'reviewed-records'),read(base,'public-ids'),read(base,'proposals'),read(pub,'directory'),read(pub,'mailing'),read(pub,'social'),read(pub,'business-details'),read(base,'address-updates')]);
const approved=new Map([0,2,4,5,6,7,8,9,13,14,15,16,17,18,19].map(i=>[p[i].key,p[i].socialLinks]));
approved.set(p[12].key,['https://www.instagram.com/refuge_clt/']);
const report={socialAssociationsAdded:0,mailingAddressesResolved:0,visitPolicies:2};const before=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)));
for(const r of rows){
 const id=ids[r.key];if(!id)continue;
 if(approved.has(r.proposalKey)){
  let review=s.reviews.find(x=>x.companyId===id);
  if(!review){review={companyId:id,checkedOn:'2026-10-01',status:'checked',notes:'Reviewed company website links; activity unverified.',sources:[],accounts:[]};s.reviews.push(review);}
  if(!review.sources.includes(r.source))review.sources.push(r.source);
  for(const link of approved.get(r.proposalKey)){
   const a=accountUrl(link);if(!a||review.accounts.some(x=>x.url===a.url))continue;
   review.accounts.push({...a,evidence:'website_linked',scope:'unclear',source:r.source,notes:'Website-linked business or shared-brand account. Recent activity unverified.'});report.socialAssociationsAdded++;
  }
 }
 if([0,1,14].some(i=>r.proposalKey===p[i].key)){
  const detail=details.records.find(x=>x.id===id);detail.visit={status:'appointment_only',summary:'The business explicitly requires appointments for in-person office visits.',address:r.address1+', '+r.city+', '+r.state+' '+r.zip,hours:null,checkedAt:'2026-10-01',sources:[r.source]};report.visitPolicies++;
 }
}
for(const u of updates){
 const mail=m.recipients.find(x=>x.id===u.company_id);const {fields:f,url}=u.observations[0];
 const next={...mail,address1:f.street_address,address2:'',city:f.city,state:f.state,zip:f.zip,source:url,addressSourceType:'company_website',reviewedOn:'2026-10-01',status:'published'};
 if(!completeAddress(next))throw Error('Incomplete reviewed mailing address');
 if(mail.status!=='published')report.mailingAddressesResolved++;Object.assign(mail,next);
}
s.publishedAt='2026-10-01';validateSocial(s,socialCompanies(d,m));report.newDistinctSocialUrls=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)).filter(u=>!before.has(u))).size;
for(const [n,x]of [['social',s],['mailing',m],['business-details',details]])await save(pub,n,x);
await save(base,'enrichment-report',report);console.log(JSON.stringify(report));
