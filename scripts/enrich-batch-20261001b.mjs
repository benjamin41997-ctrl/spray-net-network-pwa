import {readFile,writeFile} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
import {completeAddress} from '../site/mailing-model.js';
const base=new URL('../../spray-net-networking/data/batch-20261001b/',import.meta.url),publicDir=new URL('../site/data/',import.meta.url);
const read=async(base,name)=>JSON.parse(await readFile(new URL(name+'.json',base),'utf8'));
const save=async(base,name,value)=>writeFile(new URL(name+'.json',base),JSON.stringify(value,null,2)+'\n');
const [rows,ids,approved,d,m,s,details]=await Promise.all([read(base,'reviewed-records'),read(base,'public-ids'),read(base,'approved-socials'),read(publicDir,'directory'),read(publicDir,'mailing'),read(publicDir,'social'),read(publicDir,'business-details')]);
const report={newSocialAssociations:0,companiesReviewed:0,mailingAddressesResolved:0};
const before=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)));
for(const r of rows){
 const id=ids[r.key];if(!id||!approved[r.proposalKey])continue;
 let review=s.reviews.find(x=>x.companyId===id);
 if(!review){review={companyId:id,checkedOn:'2026-10-01',status:'checked',notes:'Reviewed business website links. Account activity and response availability remain unverified.',sources:[],accounts:[]};s.reviews.push(review);}
 review.checkedOn='2026-10-01';if(!review.sources.includes(r.source))review.sources.push(r.source);report.companiesReviewed++;
 for(const link of approved[r.proposalKey]){
  const account=accountUrl(link);if(!account||review.accounts.some(a=>a.url===account.url))continue;
  review.accounts.push({...account,evidence:'website_linked',scope:'unclear',source:r.source,notes:'Explicitly reviewed link from the business website. May be a shared brand or practitioner account; recent activity is unverified.'});report.newSocialAssociations++;
 }
}
const jamison={id:1100,name:d.companies.find(c=>c.id===1100).name,category:'property_management',attention:'',address1:'220 N Ames Street Suite 104',address2:'',city:'Matthews',state:'NC',zip:'28105',country:'US',source:'https://www.jamisonpm.com/waxhaw-property-management',reviewedOn:'2026-10-01',status:'published',addressSourceType:'company_website'};
if(!completeAddress(jamison))throw Error('Incomplete reviewed mailing address');
const prior=m.recipients.find(r=>r.id===1100);if(!prior){m.recipients.push(jamison);report.mailingAddressesResolved++;}else if(prior.status!=='published'){Object.assign(prior,jamison);report.mailingAddressesResolved++;}
const heirloom=rows.find(r=>r.name==='Heirloom Salon');
if(heirloom){const detail=details.records.find(r=>r.id===ids[heirloom.key]);if(detail&&!detail.people.some(p=>p.name==='Heather Lynn'))detail.people.push({id:1,name:'Heather Lynn',role:'Owner / master stylist',email:'',phone:'',sources:[{url:'https://www.heirloomsalon.net/',type:'company website',date:'2026-10-01'}]});}
s.publishedAt='2026-10-01';validateSocial(s,socialCompanies(d,m));
report.newDistinctSocialUrls=new Set(s.reviews.flatMap(r=>r.accounts.map(a=>a.url)).filter(u=>!before.has(u))).size;
for(const [name,value]of [['mailing',m],['social',s],['business-details',details]])await save(publicDir,name,value);
await save(base,'enrichment-report',report);console.log(JSON.stringify(report));
