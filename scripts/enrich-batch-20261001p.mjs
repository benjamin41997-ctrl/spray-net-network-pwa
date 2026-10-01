import {readFile,writeFile} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
const base='../spray-net-networking/data/batch-20261001p/';const read=async p=>JSON.parse(await readFile(p,'utf8'));const save=async(p,x)=>writeFile(p,JSON.stringify(x,null,2)+'\n');
const rows=await read(base+'reviewed-records.json'),ids=await read(base+'public-ids.json'),d=await read('site/data/directory.json'),m=await read('site/data/mailing.json'),s=await read('site/data/social.json'),details=await read('site/data/business-details.json');
for(const update of await read(base+'public-address-holds.json')){const r=m.recipients.find(r=>r.id===update.id);if(!r)throw Error('Missing '+update.id);Object.assign(r,update);}
for(const [name,urls,source] of [
 ['Cloth & Clay',['https://www.facebook.com/clothandclayshop/','https://www.instagram.com/clothandclayconsign/'],'https://www.clothandclayshop.com/'],
 ['Forest Trail',['https://www.facebook.com/foresttrailminthill','https://www.instagram.com/foresttrailminthill','https://www.tiktok.com/@foresttrailminthill'],'https://www.foresttrailhouse.com/']]){
 const row=rows.find(r=>r.name===name),id=ids[row.key];if(!id)throw Error(name);
 let review=s.reviews.find(r=>r.companyId===id);if(!review){review={companyId:id,checkedOn:'2026-10-01',status:'checked',notes:'Official owned website links reviewed; account activity not independently checked.',sources:[source],accounts:[]};s.reviews.push(review);}
 if(!review.sources.includes(source))review.sources.push(source);
 for(const url of urls){const canonical=accountUrl(url);if(!canonical)throw Error(url);if(!review.accounts.some(a=>a.url===canonical.url))review.accounts.push({...canonical,evidence:'website_linked',scope:'business',source,notes:'Business account explicitly linked by the owned website.'});}
 if(name==='Forest Trail'){const detail=details.records.find(r=>r.id===id);detail.services='Coffee and cocktails. Owned website reports storefront construction and reopening pending; current storefront opening is not confirmed.';m.recipients.find(r=>r.id===id).prospectNotes='Storefront reopening pending; separate coffee trailer advertises8400FairviewRd. Full business mailing route and vendor visit suitability need confirmation.';}
}
const dental=details.records.find(r=>r.id===1000499),source='https://freshdentalnc.com/contact-dentist/';if(!dental.sources.some(s=>s.url===source))dental.sources.push({url:source,type:'company website; current Indian Trail office not listed',date:'2026-10-01'});
validateSocial(s,socialCompanies(d,m));await save('site/data/mailing.json',m);await save('site/data/social.json',s);await save('site/data/business-details.json',details);
