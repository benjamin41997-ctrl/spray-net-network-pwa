// Apply a manually reviewed, dated pass. Discovery output is never auto-published.
// Usage: node scripts/apply-research-pass.mjs docs/research-pass-YYYY-MM-DD.json
import {readFile,writeFile} from 'node:fs/promises';
import {validateRecipient,mergeMailingCatalog,recipientKey,mailingCategories} from '../site/mailing-model.js';
import {validateResearch} from '../site/research-model.js';
const input=process.argv[2];if(!input)throw Error('Supply a reviewed pass JSON file.');
const pass=JSON.parse(await readFile(input,'utf8'));
if(pass.schemaVersion!==1||!Array.isArray(pass.reviews)||!Array.isArray(pass.passes))throw Error('Invalid reviewed pass.');
const path=new URL('../site/data/',import.meta.url),catalog=JSON.parse(await readFile(new URL('mailing.json',path),'utf8'));
const directory=JSON.parse(await readFile(new URL('directory.json',path),'utf8'));
const research=JSON.parse(await readFile(new URL('research.json',path),'utf8'));
const identities=new Map();let next=Math.max(1000000,...catalog.recipients.map(r=>r.id))+1,added=0,updated=0;
for(const review of pass.reviews){
 const {key,recipientId,...fields}=review;if(typeof key!=='string'||identities.has(key))throw Error('Each review needs a unique key.');
 let old=recipientId?catalog.recipients.find(r=>r.id===recipientId):catalog.recipients.find(r=>recipientKey(r)===recipientKey(fields));
 if(recipientId&&!old)throw Error('Unknown existing recipient.');
 if(old&&fields.name&&fields.name!==old.name)throw Error('Do not rename an existing recipient through a research pass.');
 const record={...(old||{}),...fields,id:old?.id||next++};validateRecipient(record);
 if(old){catalog.recipients[catalog.recipients.indexOf(old)]=record;updated++}else{catalog.recipients.push(record);added++}
 identities.set(key,record.id);
}
for(const p of pass.passes){
 const {reviewKeys,...fields}=p;
 const entry={...fields,reviewedIds:reviewKeys.map(k=>{if(!identities.has(k))throw Error('Unknown review key.');return identities.get(k)})};
 const i=research.passes.findIndex(x=>x.id===entry.id);if(i<0)research.passes.push(entry);else research.passes[i]=entry;
}
mergeMailingCatalog(catalog.recipients,directory.companies);validateResearch(research,catalog.recipients,mailingCategories);
catalog.publishedAt=pass.publishedAt;
await writeFile(new URL('mailing.json',path),JSON.stringify(catalog,null,2)+'\n');
await writeFile(new URL('research.json',path),JSON.stringify(research,null,2)+'\n');
console.log(JSON.stringify({added,updated,published:catalog.recipients.filter(r=>r.status==='published').length,held:catalog.recipients.filter(r=>r.status!=='published').length,passes:research.passes.length}));
