import {mailingAreas,mailingArea} from './mailing-territory.js';
import {publicUrl,validDay} from './prospect-model.js';
export function validateResearch(data,catalog,categories){
 if(data?.schemaVersion!==1||!Array.isArray(data.passes))throw Error('Invalid research log.');
 const ids=new Map(catalog.map(r=>[r.id,r])),seen=new Set();
 for(const p of data.passes){
  if(!p||Object.keys(p).some(k=>!['id','area','category','searchedOn','sources','reviewedIds','unresolved','notes','nextAction'].includes(k))||typeof p.id!=='string'||seen.has(p.id)||!mailingAreas.some(a=>a.id===p.area)||!Object.hasOwn(categories,p.category)||!validDay(p.searchedOn)||!Array.isArray(p.sources)||!p.sources.length||!Array.isArray(p.reviewedIds)||new Set(p.reviewedIds).size!==p.reviewedIds.length||!Array.isArray(p.unresolved))throw Error('Invalid research pass.');
  seen.add(p.id);
  for(const s of p.sources)if(!publicUrl(s.url)||typeof s.label!=='string'||!s.label.trim()||s.label.length>200)throw Error('Invalid research source.');
  for(const k of ['notes','nextAction'])if(typeof p[k]!=='string'||!p[k].trim()||p[k].length>1500)throw Error('Research pass needs an outcome and next action.');
  for(const id of p.reviewedIds){const r=ids.get(id);if(!r||r.category!==p.category||mailingArea(r)!==p.area)throw Error('Research pass recipient does not match its segment.');}
  if(p.unresolved.some(v=>typeof v!=='string'||!v.trim()||v.length>1000))throw Error('Invalid unresolved research item.');
 }
 return data;
}
export function segmentResearch(passes,area,category){return passes.filter(p=>p.area===area&&p.category===category).sort((a,b)=>b.searchedOn.localeCompare(a.searchedOn)||b.id.localeCompare(a.id));}
