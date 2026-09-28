import {accountUrl,progressKey} from './social-model.js';
export function validateProgress(records){
 if(!Array.isArray(records)||records.length>20000)throw Error('Invalid social progress backup.');
 const keys=new Set();
 for(const r of records){if(!r||Object.keys(r).some(k=>!['profile','url','status','updatedAt'].includes(k))||typeof r.profile!=='string'||!r.profile.trim()||r.profile.length>120||typeof r.url!=='string'||accountUrl(r.url)?.url!==r.url||!['pending','followed','skip'].includes(r.status)||typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt)))throw Error('Invalid social progress entry.');const key=progressKey(r.profile,r.url);if(keys.has(key))throw Error('Duplicate social progress entry.');keys.add(key)}
 return records;
}
let db;
function open(){return db??=new Promise((resolve,reject)=>{const r=indexedDB.open('spray-net-social-progress',1);r.onupgradeneeded=()=>r.result.createObjectStore('progress');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Social progress storage is unavailable.'));r.onblocked=()=>reject(Error('Close other app tabs and reload.'));})}
export async function readProgress(){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('progress').objectStore('progress').getAll();r.onsuccess=()=>{try{resolve(validateProgress(r.result))}catch(e){reject(e)}};r.onerror=()=>reject(Error('Could not read social progress.'))})}
export async function writeProgress(records){validateProgress(records);const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('progress','readwrite'),store=tx.objectStore('progress');for(const row of records){const key=progressKey(row.profile,row.url),r=store.get(key);r.onsuccess=()=>{if(!r.result||row.updatedAt>r.result.updatedAt)store.put(row,key)}}tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(Error('Social progress was not saved.'));})}
export function parseSocialBackup(text){const b=JSON.parse(text);if(b?.format!=='spray-net-social-progress'||b.version!==1)throw Error('Choose a Social Links backup.');return validateProgress(b.records)}
