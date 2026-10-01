import {readFile,writeFile} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
const base=new URL('../../spray-net-networking/data/batch-20261001e/',import.meta.url),pub=new URL('../site/data/',import.meta.url);
const read=async(b,n)=>JSON.parse(await readFile(new URL(n+'.json',b),'utf8'));
const save=async(b,n,v)=>writeFile(new URL(n+'.json',b),JSON.stringify(v,null,2)+'\n');
const [rows,ids,p,d,m,s,details,v]=await Promise.all([read(base,'reviewed-records'),read(base,'public-ids'),read(base,'proposals'),read(pub,'directory'),read(pub,'mailing'),read(pub,'social'),read(pub,'business-details'),read(pub,'verification')]);
const approved=new Map([0,5,7,8,10,11,14,16,17,18,20,23,25,27,29].map(i=>[p[i].key,p[i].socialLinks]));
approved.set(p[28].key,['https://www.facebook.com/themodernaesthetic.clt','https://www.instagram.com/themodernaesthetic_','https://www.tiktok.com/@themodernaesthetic.clt','https://www.youtube.com/@themodernaestheticco']);
const report={socialAssociationsAdded:0,contactAssociationsAdded:0,visitPolicies:0};const before=new Set(s.reviews.flatMap(x=>x.accounts.map(a=>a.url)));
for(const r of rows){
 const id=ids[r.key];if(!id)continue;
 if(approved.has(r.proposalKey)){
  let review=s.reviews.find(x=>x.companyId===id);
  if(!review){review={companyId:id,checkedOn:'2026-10-01',status:'checked',notes:'Reviewed owned-site account links; account activity remains unverified.',sources:[],accounts:[]};s.reviews.push(review);}
  if(!review.sources.includes(r.source))review.sources.push(r.source);
  for(const link of approved.get(r.proposalKey)){
   const a=accountUrl(link);if(!a||review.accounts.some(x=>x.url===a.url))continue;
   review.accounts.push({...a,evidence:'website_linked',scope:'unclear',source:r.source,notes:'Business website link; may represent the shared brand. Recent activity unverified.'});report.socialAssociationsAdded++;
  }
 }
 const detail=details.records.find(x=>x.id===id);if(!detail)continue;
 if(r.proposalKey===p[3].key)for(const [name,role,email]of [['Rhonda Benfield','Attorney / owner','rhonda@palmetto-law.com'],['Walter Dusky','Attorney','walter@palmetto-law.com']])if(!detail.people.some(x=>x.name===name)){
  detail.people.push({id:Math.max(0,...detail.people.map(x=>x.id))+1,name,role,email,phone:'',sources:[{url:r.source,type:'company website',date:'2026-10-01'}]});report.contactAssociationsAdded++;
 }
 let visit;
 if(r.name==='Palmetto Law Associates - Lake Wylie')visit={status:'no_public_office',summary:'The published contact page explicitly says this office is not staffed. Contact the firm before planning any visit.',address:null};
 if(r.name==='Rumor Aesthetics')visit={status:'appointment_only',summary:'The business publishes appointment-only hours. Arrange an introduction before visiting.',address:r.address1+', '+r.city+', '+r.state+' '+r.zip};
 if(r.name==='Kay Insurance Agency')visit={status:'walk_in',summary:'The business explicitly welcomes visits during normal business hours. Use the street office, not the mailing PO Box.',address:'1501 Ebenezer Road, Rock Hill, SC 29732'};
 if(visit){detail.visit={...visit,hours:null,checkedAt:'2026-10-01',sources:[r.source]};report.visitPolicies++;}
 if(['Rumor Aesthetics','Kay Insurance Agency','Aesthetics by Lisa Kruse'].includes(r.name)&&!v.items.some(x=>x.companyId===id))v.items.push({companyId:id,questions:['Who approves exterior painting for this location: the business owner, landlord, or property manager?',...(r.name==='Aesthetics by Lisa Kruse'?['Is this an appointment-only or home-based location, and what is the preferred business mailing address?']:[])]});
}
s.publishedAt='2026-10-01';validateSocial(s,socialCompanies(d,m));report.newDistinctSocialUrls=new Set(s.reviews.flatMap(x=>x.accounts.map(a=>a.url)).filter(u=>!before.has(u))).size;
for(const [n,x]of [['social',s],['business-details',details],['verification',v]])await save(pub,n,x);
await save(base,'enrichment-report',report);console.log(JSON.stringify(report));
