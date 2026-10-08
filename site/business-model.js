import {mailingCategories,mergeMailingCatalog} from './mailing-model.js';
import {unknownVisit,validateVisit} from './visits.js';
export const specialties={interior_design:'Interior / home designers',cabinetry:'Cabinet makers / dealers / showrooms',countertops:'Countertop installers / suppliers / showrooms'};
export function isHomeDesigner(c){
 const text=[c.subcategory,c.services,c.name].join(' ');
 return /\binterior\s*design(?:er|ers)?\b|\b(?:custom\s+)?(?:home|house|residential)\s+design(?:er|ers)?\b/i.test(text)||
  (c.category==='kitchen'&&/^Designers(?:\s*,|$)/i.test(c.subcategory||''));
}
export function matchesSpecialty(c,value){if(!value)return true;if(value==='interior_design')return isHomeDesigner(c);const text=[c.subcategory,c.services,c.name].join(' ');return ({cabinetry:/cabinet|millwork|woodwork/i,countertops:/countertop|granite|quartz|stone slab/i})[value]?.test(text)||false;}

export function validateBusinessDetails(data,recipients){
 if(data?.schemaVersion!==1||!Array.isArray(data.records))throw Error('Unsupported business details.');
 const ids=new Set(recipients.filter(r=>r.id>=1000000).map(r=>r.id)),seen=new Set();
 const allowed=['id','website','email','phone','services','subcategory','verified','people','sources','visit'];
 const url=v=>{const u=new URL(v);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||['localhost','127.0.0.1'].includes(u.hostname))throw Error('Invalid public business URL.');};
 const sources=rows=>{if(!Array.isArray(rows)||!rows.length)throw Error('Business evidence required.');for(const s of rows){url(s.url);if(typeof s.type!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.date))throw Error('Invalid business evidence.');}};
 for(const r of data.records){
  if(!ids.has(r.id)||seen.has(r.id)||Object.keys(r).some(k=>!allowed.includes(k)))throw Error('Invalid business details identity.');seen.add(r.id);
  for(const k of ['website','email','phone','services','subcategory','verified'])if(r[k]!==undefined&&(typeof r[k]!=='string'||r[k].length>1500))throw Error('Invalid business detail.');
  if(r.website)url(r.website);if(r.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))throw Error('Invalid business email.');
  sources(r.sources);if(r.visit)validateVisit(r.visit);
  if(!Array.isArray(r.people))throw Error('Business contacts required.');
  const people=new Set();for(const p of r.people){if(!Number.isSafeInteger(p.id)||p.id<1||people.has(p.id)||typeof p.name!=='string'||!p.name.trim()||typeof p.role!=='string'||Object.keys(p).some(k=>!['id','name','role','email','phone','sources'].includes(k)))throw Error('Invalid business contact.');people.add(p.id);sources(p.sources);}
 }
 return data;
}

export function buildNetwork(directory,mailing,details){
 validateBusinessDetails(details,mailing.recipients);
 const catalog=mergeMailingCatalog(mailing.recipients,directory.companies),byId=new Map(catalog.map(r=>[r.id,r]));
 const extras=new Map(details.records.map(r=>[r.id,r]));
 const referrals=directory.companies.map(c=>({...c,audiences:c.category==='property_management'?['referral','business']:['referral'],mailing:byId.get(c.id)}));
 const businesses=catalog.filter(r=>r.id>=1000000).map(r=>({id:r.id,name:r.name,category:r.category,city:r.city,state:r.state,zip:r.zip,website:'',email:'',phone:'',services:'',subcategory:mailingCategories[r.category],serviceArea:'',verified:r.reviewedOn,people:[],sources:r.source?[{url:r.source,type:r.addressSourceType||'address source',date:r.reviewedOn}]:[],shortlist:null,visit:{...unknownVisit},...extras.get(r.id),mailing:r,audiences:['business']}));
 const companies=[...referrals,...businesses];
 for(const c of companies){
  c.directoryCategory=isHomeDesigner(c)?'interior_design':c.category;
  if(c.directoryCategory==='interior_design')c.audiences=['referral','business'];
  c.search=[c.name,c.city,c.state,c.zip,c.subcategory,c.services,c.serviceArea,c.mailing?.address1,...c.people.map(p=>p.name)].filter(Boolean).join(' ').toLowerCase();
 }
 return {...directory,categories:{interior_design:specialties.interior_design,...mailingCategories,...directory.categories},companies};
}
