export const activityTypes={visit:'In-person meeting / visit',call:'Phone call',email:'Email sent',one_pager:'One-pager delivered',direct_mail:'Direct mail sent',text:'Text sent',social:'Social / LinkedIn message',event:'Networking event',other:'Other contact'};
export const deliveries={email:'Email',in_person:'In person',postal:'Postal mail',other:'Other'};
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateOnly=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const keys=['id','companyId','companyName','contactId','contactName','recipient','type','delivery','occurredOn','material','notes','outcome','followUpOn','followUpDone','createdAt','updatedAt','deletedAt'];
export function validateActivity(r){
 if(!r||typeof r!=='object'||Object.keys(r).length!==keys.length||Object.keys(r).some(k=>!keys.includes(k)))throw Error('Invalid activity fields. Choose an exported tracker backup.');
 if(typeof r.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(r.id)||!Number.isSafeInteger(r.companyId)||r.companyId<1||!Object.hasOwn(activityTypes,r.type))throw Error('Invalid company or activity type.');
 for(const k of ['companyName','contactName','recipient','delivery','material','notes','outcome'])if(typeof r[k]!=='string'||r[k].length>(k==='notes'?5000:500))throw Error('Activity text is missing or too long.');
 if(!r.companyName.trim()||(r.contactId!==null&&(!Number.isSafeInteger(r.contactId)||r.contactId<1)))throw Error('Choose a business.');
 if(!dateOnly(r.occurredOn))throw Error('Enter a valid completed activity date.');
 if(r.followUpOn!==''&&!dateOnly(r.followUpOn))throw Error('Enter a valid follow-up date.');
 if(typeof r.followUpDone!=='boolean')throw Error('Invalid follow-up status.');
 if(r.delivery!==''&&!Object.hasOwn(deliveries,r.delivery))throw Error('Invalid delivery method.');
 if(r.type==='one_pager'&&!Object.hasOwn(deliveries,r.delivery))throw Error('Choose how the one-pager was delivered.');
 if(['one_pager','direct_mail'].includes(r.type)&&!r.material.trim())throw Error('Name the one-pager or mailer so you can avoid sending it twice.');
 for(const k of ['createdAt','updatedAt'])if(typeof r[k]!=='string'||!Number.isFinite(Date.parse(r[k])))throw Error('Invalid activity timestamp.');
 if(r.deletedAt!==null&&(typeof r.deletedAt!=='string'||!Number.isFinite(Date.parse(r.deletedAt))))throw Error('Invalid removed activity.');
 return structuredClone(r);
}
export function summary(records,companyId,day=today()){
 const list=records.filter(r=>r.companyId===companyId&&!r.deletedAt).sort((a,b)=>b.occurredOn.localeCompare(a.occurredOn)||b.createdAt.localeCompare(a.createdAt));
 const due=list.filter(r=>r.followUpOn&&!r.followUpDone&&r.followUpOn<=day);
 const days=list.length?Math.round((Date.parse(day+'T12:00:00Z')-Date.parse(list[0].occurredOn+'T12:00:00Z'))/86400000):null;
 return {list,last:list[0]||null,count:list.length,due,days};
}
let database;
function open(){return database??=new Promise((resolve,reject)=>{
 const request=indexedDB.open('spray-net-partner-outreach',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('activities',{keyPath:'id'});
 request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db)};
 request.onerror=()=>reject(Error('Private storage could not open. Check browser storage settings.'));
 request.onblocked=()=>reject(Error('Close other Partner Network tabs and try again.'));
});}
export async function readActivities(){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('activities').objectStore('activities').getAll();r.onsuccess=()=>{try{resolve(r.result.map(validateActivity))}catch(e){reject(e)}};r.onerror=()=>reject(Error('Could not read activity history.'))})}
export async function saveActivity(record,expected=null){
 const value=validateActivity(record),db=await open();
 if(value.occurredOn>today())throw Error('Log a completed activity dated today or earlier. Use Follow-up for future plans.');
 await new Promise((resolve,reject)=>{const tx=db.transaction('activities','readwrite'),store=tx.objectStore('activities');let conflict=false;
 const get=store.get(value.id);get.onsuccess=()=>{if((get.result?.updatedAt||null)!==expected){conflict=true;tx.abort()}else{if(get.result&&Date.parse(value.updatedAt)<=Date.parse(get.result.updatedAt))value.updatedAt=new Date(Date.parse(get.result.updatedAt)+1).toISOString();store.put(value)}};
 tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error(conflict?'This activity changed in another tab. Reopen it before editing.':'Activity was not saved. Storage may be full or unavailable. Export a backup if possible.'));
 });
}
export function parseBackup(text){
 const b=JSON.parse(text);
 if(b?.format!=='spray-net-outreach'||b.version!==1||!Array.isArray(b.activities)||b.activities.length>50000)throw Error('Choose a Partner Network tracker backup (version 1).');
 const ids=new Set();for(const r of b.activities){validateActivity(r);if(ids.has(r.id))throw Error('Backup contains duplicate activity IDs.');ids.add(r.id)}
 return b.activities;
}
export async function importActivities(records){
 records.forEach(validateActivity);const db=await open();
 return new Promise((resolve,reject)=>{const tx=db.transaction('activities','readwrite'),store=tx.objectStore('activities');let changed=0;
 for(const r of records){const get=store.get(r.id);get.onsuccess=()=>{if(!get.result||Date.parse(r.updatedAt)>Date.parse(get.result.updatedAt)){store.put(r);changed++}}}
 tx.oncomplete=()=>resolve(changed);tx.onabort=tx.onerror=()=>reject(Error('Import failed. No changes were saved.'));
 });
}
// A mailed batch is one transaction. Stable IDs make retries safe without duplicating contacts.
export async function saveMailingActivities(records){
 records.forEach(r=>{validateActivity(r);if(r.occurredOn>today())throw Error('A sent mailing must be dated today or earlier.');});
 const db=await open();
 return new Promise((resolve,reject)=>{const tx=db.transaction('activities','readwrite'),store=tx.objectStore('activities');let existing=0,checked=0,conflict=false;
  for(const r of records){const get=store.get(r.id);get.onsuccess=()=>{if(get.result)existing++;checked++;if(checked===records.length){if(existing&&existing!==records.length){conflict=true;tx.abort();}else if(!existing)for(const value of records)store.add(value);}};}
  tx.oncomplete=()=>resolve(existing?0:records.length);tx.onabort=tx.onerror=()=>reject(Error(conflict?'Part of this mailing is already in the tracker. Review its history before logging more entries.':'Mailing was not logged. No activities were saved.'));
 });
}
