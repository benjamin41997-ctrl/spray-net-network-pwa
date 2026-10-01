// Explicitly reviewed public evidence; preserve IDs and existing social account keys.
import {readFile,writeFile} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
import {completeAddress} from '../site/mailing-model.js';
const base=new URL('../../spray-net-networking/data/batch-20261001c/',import.meta.url),pub=new URL('../site/data/',import.meta.url);
const read=async(b,n)=>JSON.parse(await readFile(new URL(n+'.json',b),'utf8'));
const save=async(b,n,v)=>writeFile(new URL(n+'.json',b),JSON.stringify(v,null,2)+'\n');
const [rows,ids,proposals,d,m,s,details,verification]=await Promise.all([read(base,'reviewed-records'),read(base,'public-ids'),read(base,'proposals'),read(pub,'directory'),read(pub,'mailing'),read(pub,'social'),read(pub,'business-details'),read(pub,'verification')]);
const report={socialAssociationsAdded:0,mailingAddressesResolved:0,mailingAddressesClarified:0,namedContactsAdded:0};
const oldUrls=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)));
const approved=new Map([23,25,29,40,41,55,56,61,69,76].map(i=>[proposals[i].key,proposals[i].socialLinks]));
for(const r of rows){
 const id=ids[r.key];if(!id)continue;
 const mail=m.recipients.find(x=>x.id===id);
 if(mail&&r.disposition==='existing'&&[1000525,1000424,1130,1129,1118,1119].includes(id)){
  const next={...mail,address1:r.address1,address2:r.address2,city:r.city,state:r.state,zip:r.zip,source:r.source,reviewedOn:'2026-10-01',addressSourceType:'company_website',status:'published'};
  if(!completeAddress(next))throw Error('Incomplete reviewed address');
  if(mail.status!=='published')report.mailingAddressesResolved++;
  else if(mail.address1!==next.address1||mail.address2!==next.address2)report.mailingAddressesClarified++;
  Object.assign(mail,next);
 }
 if(approved.has(r.proposalKey)){
  let review=s.reviews.find(x=>x.companyId===id);
  if(!review){review={companyId:id,checkedOn:'2026-10-01',status:'checked',notes:'Business website account links reviewed; account activity remains unverified.',sources:[],accounts:[]};s.reviews.push(review);}
  if(!review.sources.includes(r.source))review.sources.push(r.source);
  for(const link of approved.get(r.proposalKey)){
   const account=accountUrl(link);if(!account||review.accounts.some(a=>a.url===account.url))continue;
   review.accounts.push({...account,evidence:'website_linked',scope:'unclear',source:r.source,notes:'Reviewed business website link; may represent the shared brand. Recent activity unverified.'});report.socialAssociationsAdded++;
  }
 }
 const people=r.name==='Gibson Mortuary Service'?[['Danny Gibson','Owner / funeral director / embalmer','danny@gibsonmortuaryservice.com']]:r.name==='Calloway Primary Care & Wellness LLC'?[['Cassandra Calloway','Family nurse practitioner','']]:r.name==='PrimeCare Medical Center'?[['Patrick Evivie','Physician',''],['Alicia Bullough','Physician assistant','']]:[];
 const detail=details.records.find(x=>x.id===id);
 if(detail)for(const [name,role,email]of people)if(!detail.people.some(p=>p.name===name)){
  detail.people.push({id:Math.max(0,...detail.people.map(p=>p.id))+1,name,role,email,phone:'',sources:[{url:r.source,type:'company website',date:'2026-10-01'}]});report.namedContactsAdded++;
 }
 if(r.name==='Floor Coverings International Central Charlotte'&&!verification.items.some(x=>x.companyId===id))verification.items.push({companyId:id,questions:['Is 1213 W Morehead Street Suite 500-4262 a mailing address only, or an office that welcomes visitors?','Who should receive partnership introductions for the Central Charlotte franchise?']});
}
for(const [id,questions]of [[1077,['Are KBN Interiors and Black Sheep Cabinets & Design separate businesses sharing the Belmont office, or brands of the same business?']],[1000525,['Who approves exterior painting at this location: the practice owner, landlord, or property manager?']],[1118,['Who handles exterior building maintenance approval for the Charlotte showroom: local management, landlord, or corporate facilities?']]])if(!verification.items.some(x=>x.companyId===id))verification.items.push({companyId:id,questions});
s.publishedAt='2026-10-01';validateSocial(s,socialCompanies(d,m));
report.newDistinctSocialUrls=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)).filter(u=>!oldUrls.has(u))).size;
for(const [n,v]of [['mailing',m],['social',s],['business-details',details],['verification',verification]])await save(pub,n,v);
await save(base,'enrichment-report',report);console.log(JSON.stringify(report));
