import {readFile,writeFile} from 'node:fs/promises';
import {accountUrl,validateSocial,socialCompanies} from '../site/social-model.js';
const base='../spray-net-networking/data/batch-20261001n/';
const read=async p=>JSON.parse(await readFile(p,'utf8'));const save=async(p,x)=>writeFile(p,JSON.stringify(x,null,2)+'\n');
const ids=await read(base+'public-ids.json'),rows=await read(base+'reviewed-records.json');
const d=await read('site/data/directory.json'),m=await read('site/data/mailing.json'),s=await read('site/data/social.json'),details=await read('site/data/business-details.json');
for(const [name,urls,source] of [
 ['Broadcloth Boutique',['https://instagram.com/broadclothboutique','https://www.facebook.com/broadclothboutique'],'https://broadclothboutique.com/'],
 ['The Peach Blossom Boutique - Garand Candles',['https://www.facebook.com/garandcandles/','https://www.instagram.com/garandcandlesandclothes/'],'https://www.garandcandles.com/'],
 ['East Main Guest House',['https://www.facebook.com/emgh600/','https://www.instagram.com/eastmain_guesthouse/'],'https://eastmainguesthouse.com/our-inn/']]){
 const row=rows.find(r=>r.name===name),id=row.matchedId||ids[row.key];if(!id)throw Error(name);
 let review=s.reviews.find(r=>r.companyId===id);if(!review){review={companyId:id,checkedOn:'2026-10-01',status:'checked',notes:'Official business website links reviewed; social activity not independently checked.',sources:[source],accounts:[]};s.reviews.push(review);}
 if(!review.sources.includes(source))review.sources.push(source);
 for(const url of urls){const platform=url.includes('instagram')?'instagram':'facebook',normalized=accountUrl(url)?.url;if(!normalized)throw Error(url);if(!review.accounts.some(a=>a.platform===platform&&accountUrl(a.url)?.url===normalized))review.accounts.push({platform,url:normalized,evidence:'website_linked',scope:'brand',source,notes:'Official business profile linked by the owned website.'});}
}
details.records=details.records.filter(r=>r.id>=1000000);
validateSocial(s,socialCompanies(d,m));await save('site/data/social.json',s);await save('site/data/business-details.json',details);


