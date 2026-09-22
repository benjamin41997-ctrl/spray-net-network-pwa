import {validateRecipient,validateFilters} from './mailing-model.js';
const blank=()=>({version:1,updatedAt:null,lists:[],suppressed:[],batches:[]});
let dbPromise;
function open(){return dbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('spray-net-mailing-lists',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Mailing list storage is unavailable.'));r.onblocked=()=>reject(Error('Close other Partner Network tabs and retry.'));});}
export function validateMailingState(s){
  if(!s||s.version!==1||!Array.isArray(s.lists)||s.lists.length>500||!Array.isArray(s.suppressed)||s.suppressed.some(id=>!Number.isSafeInteger(id)||id<1)||!Array.isArray(s.batches)||s.batches.length>500)throw Error('Invalid mailing backup.');
  if(s.updatedAt!==null&&(typeof s.updatedAt!=='string'||!Number.isFinite(Date.parse(s.updatedAt))))throw Error('Invalid mailing backup date.');
  const ids=new Set();
  for(const l of s.lists){if(!l||typeof l.name!=='string'||!l.name.trim()||l.name.length>120||ids.has(l.name))throw Error('Invalid saved list.');ids.add(l.name);validateFilters(l.filters);}
  ids.clear();for(const b of s.batches){
    if(!b||typeof b.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(b.id)||ids.has(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>120||typeof b.createdAt!=='string'||!Number.isFinite(Date.parse(b.createdAt))||!Array.isArray(b.rows)||!b.rows.length||b.rows.length>10000)throw Error('Invalid exported list.');
    ids.add(b.id);const recipients=new Set();for(const r of b.rows){validateRecipient(r);if(recipients.has(r.id))throw Error('Duplicate recipient in exported list.');recipients.add(r.id);}
  }
  return structuredClone(s);
}
export async function readMailingState(){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{try{resolve(r.result?validateMailingState(r.result):blank())}catch(e){reject(e)}};r.onerror=()=>reject(Error('Could not read saved mailing lists.'));});}
export async function saveMailingState(state){
  const value=validateMailingState(state),db=await open();
  return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state');let conflict=false;
    const r=store.get('current');r.onsuccess=()=>{if((r.result?.updatedAt??null)!==state.updatedAt){conflict=true;tx.abort();return;}value.updatedAt=new Date(Math.max(Date.now(),Date.parse(state.updatedAt||0)+1||0)).toISOString();store.put(value,'current');};
    tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(Error(conflict?'Mailing lists changed in another tab. Reload before saving.':'Mailing lists were not saved. Check browser storage.'));
  });
}
export function parseMailingBackup(text){const b=JSON.parse(text);if(b?.format!=='spray-net-mailing'||b.version!==1)throw Error('Choose a Mailing Lists JSON backup.');return validateMailingState(b.state);}
export function mergeMailingState(current,incoming){
  validateMailingState(incoming);const next=structuredClone(current),names=new Set(next.lists.map(l=>l.name)),ids=new Set(next.batches.map(b=>b.id));
  for(const list of incoming.lists)if(!names.has(list.name)){next.lists.push(list);names.add(list.name);}
  for(const batch of incoming.batches)if(!ids.has(batch.id)){next.batches.push(batch);ids.add(batch.id);}
  next.suppressed=[...new Set([...next.suppressed,...incoming.suppressed])];return validateMailingState(next);
}
