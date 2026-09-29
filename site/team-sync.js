import {teamConfig} from './team-config.js';
const preference='spray-net-team-mode';
let client,session=null,mode=false,db,validator=()=>{},timer,running=false;
export const teamSelected=()=>mode;
export const teamUser=()=>session?.user||null;
export const teamClient=()=>client;
export const syncInfo={message:'Device-only mode',pending:0,lastSync:null,error:'',conflict:false,member:''};
const emit=()=>window.dispatchEvent(new CustomEvent('team-status'));
const key=r=>r.kind+'\n'+r.record_key;
const blank=()=>({records:[],pending:[],flight:null,lastSync:null,member:'',conflict:false,accessBlocked:false});
function namespace(){if(!session?.user?.id)throw Error('Sign in under Team sync to access the shared workspace.');return teamConfig.url+'|'+session.user.id;}
function open(){return db??=new Promise((resolve,reject)=>{const r=indexedDB.open('spray-net-team-cache',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspaces');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Team offline storage is unavailable.'));});}
async function state(){const database=await open(),id=namespace();return new Promise((resolve,reject)=>{const r=database.transaction('workspaces').objectStore('workspaces').get(id);r.onsuccess=()=>resolve(r.result||blank());r.onerror=()=>reject(Error('Could not read team cache.'));});}
async function store(value){const database=await open(),id=namespace();return new Promise((resolve,reject)=>{const tx=database.transaction('workspaces','readwrite');tx.objectStore('workspaces').put(value,id);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('Team changes were not saved on this device.'));});}
async function locked(fn){if(!navigator.locks)throw Error('This browser needs Web Locks support for safe team sync. Use an up-to-date browser.');const id=namespace();return navigator.locks.request('network-sync:'+id,async()=>{if(namespace()!==id)throw Error('Team account changed.');return fn();});}
function materialize(s){const result=new Map(s.records.map(r=>[key(r),r]));for(const p of s.pending)result.set(p.kind+'\n'+p.key,{kind:p.kind,record_key:p.key,payload:p.payload,revision:p.expected});return [...result.values()];}
function notifyState(s){syncInfo.pending=s.pending.length;syncInfo.lastSync=s.lastSync;syncInfo.member=s.member;syncInfo.conflict=s.conflict;syncInfo.message=s.conflict?'Sync conflict — review required':s.pending.length?`${s.pending.length} changes waiting to sync`:s.lastSync?'Team data synced':'Team setup / first sync required';emit();}
function validateResponse(data){if(!data||typeof data.member!=='string'||!Array.isArray(data.records))throw Error('Invalid team response.');const seen=new Set();for(const r of data.records){if(!r||!Number.isSafeInteger(r.revision)||r.revision<1||typeof r.record_key!=='string'||seen.has(key(r)))throw Error('Invalid team record.');seen.add(key(r));validator(r.kind,r.payload,r.record_key);}return data;}
async function rpc(name,args={}){const {data,error}=await client.rpc(name,args).abortSignal(AbortSignal.timeout(15000));if(error)throw Object.assign(Error(error.message),{code:error.code});return validateResponse(data);}
export async function initTeam(validate){
 const {createClient}=await import('./vendor/supabase.js');
 validator=validate;try{mode=localStorage.getItem(preference)==='team';}catch{}
 client=createClient(teamConfig.url,teamConfig.key,{auth:{storageKey:'spray-net-team-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},global:{fetch:(url,options)=>fetch(url,{...options,signal:options?.signal||AbortSignal.timeout(15000)})}});
 const callback=/access_token=|code=|type=recovery/.test(location.hash+location.search);
 try{const result=await client.auth.getSession();if(result.error)throw result.error;session=result.data.session;}catch(e){syncInfo.error=e.message;}
 if(callback){if(session){mode=true;localStorage.setItem(preference,'team');}history.replaceState(null,'',location.pathname+'#team');}
 client.auth.onAuthStateChange((event,next)=>{const previous=session?.user?.id;session=next;if(previous!==next?.user?.id&&event!=='INITIAL_SESSION'){syncInfo.message=next?'Signed in — open Team sync':'Signed out';emit();if(previous)setTimeout(()=>location.reload(),0);}});
 window.addEventListener('online',()=>syncTeam());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncTeam();});
 timer=setInterval(()=>{if(!document.hidden)syncTeam();},20000);
 if(mode&&session)await syncTeam();else{syncInfo.message=mode?'Team sign-in required':'Device-only mode';emit();}
}
export function chooseTeam(value){mode=value;localStorage.setItem(preference,value?'team':'local');location.reload();}
export async function readTeam(kind){const s=await state();if(s.accessBlocked)throw Error('Team access is no longer approved. Contact the project owner.');if(!s.lastSync)throw Error('Open Team sync and complete the first sync before using shared records.');return materialize(s).filter(r=>r.kind===kind).map(r=>{validator(kind,r.payload,r.record_key);return structuredClone(r.payload);});}
// Transform runs inside the same cross-tab lock as syncing. No local legacy DB is overwritten.
export async function changeTeam(kind,transform){return locked(async()=>{
 const s=await state();if(s.accessBlocked)throw Error('Team access is no longer approved.');if(!s.lastSync)throw Error('Complete the first team sync before saving.');if(s.flight)throw Error('A previous sync is unconfirmed or conflicted. Open Team sync to resolve it before editing.');
 const current=materialize(s).filter(r=>r.kind===kind).map(r=>structuredClone(r.payload));
 const {changes,result}=transform(current);
 for(const item of changes){validator(kind,item.payload,item.key);const existing=s.pending.find(p=>p.kind===kind&&p.key===item.key),remote=s.records.find(r=>r.kind===kind&&r.record_key===item.key);if(existing)existing.payload=item.payload;else s.pending.push({kind,key:item.key,payload:item.payload,expected:remote?.revision||0});}
 if(changes.length){await store(s);notifyState(s);setTimeout(()=>syncTeam(),0);}
 return result;
});}
export async function syncTeam(){
 if(!mode||!session||running)return;
 running=true;
 try{await locked(async()=>{
  const s=await state();notifyState(s);if(!navigator.onLine){syncInfo.message=s.pending.length?'Offline — changes waiting to sync':'Offline — cached team data';emit();return;}
  if(s.conflict){syncInfo.error='Another team member changed the same record. Review Team sync before continuing.';emit();return;}
  syncInfo.message='Syncing team data…';emit();let incoming;
  if(s.pending.length){if(!s.flight){s.flight={id:crypto.randomUUID(),changes:structuredClone(s.pending)};await store(s);}
   try{incoming=await rpc('network_commit',{p_mutation:s.flight.id,p_changes:s.flight.changes});}
   catch(e){if(e.code==='40001'||e.message.includes('SYNC_CONFLICT')){s.conflict=true;await store(s);notifyState(s);}throw e;}
  }else incoming=await rpc('network_pull');
  const changed=JSON.stringify(s.records)!==JSON.stringify(incoming.records);
  s.records=incoming.records;s.member=incoming.member;s.pending=[];s.flight=null;s.conflict=false;s.accessBlocked=false;s.lastSync=new Date().toISOString();await store(s);
  syncInfo.error='';notifyState(s);if(changed)window.dispatchEvent(new CustomEvent('team-data'));
 });}catch(e){if(e.code==='42501'){try{await locked(async()=>{const s=await state();s.accessBlocked=true;await store(s);});window.dispatchEvent(new CustomEvent('team-data'));}catch{}}syncInfo.error=e.message;syncInfo.message='Not synced — '+(e.code==='PGRST202'?'database setup is required':e.code==='42501'?'team access is not approved':'check Team sync');emit();}finally{running=false;}
}
export async function teamBackup(){return {format:'spray-net-team-cache',version:1,project:teamConfig.url,userId:teamUser()?.id,state:await state()};}
export async function resolveConflict(keepLocal){
 await locked(async()=>{const s=await state();if(!s.conflict)throw Error('Only a confirmed conflict can be resolved here. Retry unconfirmed sends with Sync now.');const incoming=await rpc('network_pull');
  s.records=incoming.records;s.member=incoming.member;if(keepLocal){for(const p of s.pending)p.expected=s.records.find(r=>r.kind===p.kind&&r.record_key===p.key)?.revision||0;}else s.pending=[];
  s.flight=null;s.conflict=false;s.lastSync=new Date().toISOString();await store(s);syncInfo.error='';notifyState(s);window.dispatchEvent(new CustomEvent('team-data'));
 });await syncTeam();
}
export async function migrateTeam(entries){
 await locked(async()=>{const s=await state();if(!s.lastSync||s.pending.length||s.flight)throw Error('Finish syncing existing changes before uploading local records.');
  const incoming=await rpc('network_pull');s.records=incoming.records;let skipped=0;
  for(const entry of entries){validator(entry.kind,entry.payload,entry.key);if(s.records.some(r=>r.kind===entry.kind&&r.record_key===entry.key)){skipped++;continue;}s.pending.push({...entry,expected:0});}
  await store(s);notifyState(s);syncInfo.migration=`Queued ${s.pending.length} new records; preserved ${skipped} existing team records.`;
 });await syncTeam();
}
