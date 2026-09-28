import {validateRecords} from './suggestions-model.js';
let connection;
function open(){return connection??=new Promise((resolve,reject)=>{const r=indexedDB.open('spray-net-contact-suggestions',1);r.onupgradeneeded=()=>r.result.createObjectStore('suggestions',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Suggestion storage is unavailable.'));r.onblocked=()=>reject(Error('Close other app tabs and reload.'));});}
export async function readSuggestions(){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('suggestions').objectStore('suggestions').getAll();r.onsuccess=()=>{try{resolve(validateRecords(r.result))}catch(e){reject(e)}};r.onerror=()=>reject(Error('Could not read suggestions.'));});}
export async function saveSuggestion(row,expected=null){
 validateRecords([row]);const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('suggestions','readwrite'),store=tx.objectStore('suggestions');let error='Suggestion was not saved.';const r=store.get(row.id);r.onsuccess=()=>{if((r.result?.updatedAt??null)!==expected){error='This suggestion changed in another tab. Reload before editing.';tx.abort();return;}store.put(row);};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(Error(error));});
}
export async function importSuggestions(rows){
 validateRecords(rows);const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('suggestions','readwrite'),store=tx.objectStore('suggestions');let added=0;for(const row of rows){const r=store.get(row.id);r.onsuccess=()=>{if(!r.result){store.add(row);added++;}};}tx.oncomplete=()=>resolve(added);tx.onerror=tx.onabort=()=>reject(Error('Import failed; no suggestions were added.'));});
}
