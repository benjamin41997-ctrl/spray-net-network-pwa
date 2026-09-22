export const mailingCategories = {dentist:'Dentist offices',school:'Schools',district:'School district offices',veterinary:'Veterinary clinics',funeral:'Funeral homes',childcare:'Private childcare / preschools',church:'Churches / religious facilities',venue:'Wedding / event venues',medical:'Medical offices',med_spa:'Med spas',restaurant:'Standalone restaurants',lodging:'Independent lodging',professional:'Professional offices',property_management:'Property Management',real_estate:'Real Estate',kitchen:'Cabinet / Kitchen Industry',other:'Other businesses'};
import {mailingArea,mailingAreas} from './mailing-territory.js';
export const exteriorRoutes = {likely_business:'Likely business / owner route',likely_landlord:'Likely landlord approval',central_facilities:'Central facilities / district',unknown:'Approval route unknown'};
export const addressSourceTypes = {company_website:'Business website',licensing:'Business registry',industry_association:'Industry association',official_directory:'Official organization directory',healthcare_registry:'CMS organization registry'};
export const exportHeaders = ['Company','Attention','Address 1','Address 2','City','State','ZIP','Country'];
const clean = v => String(v ?? '').trim();
const day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v+'T12:00:00Z')) && new Date(v+'T12:00:00Z').toISOString().slice(0,10) === v;
export function validateRecipient(r) {
  const fields = ['id','name','category','attention','address1','address2','city','state','zip','country','source','reviewedOn','status'];
  if (!r || fields.some(k => !Object.hasOwn(r,k)) || Object.keys(r).some(k => !fields.includes(k) && !['prospectNotes','exterior','addressSourceType'].includes(k))) throw Error('Invalid mailing recipient fields.');
  if (Object.hasOwn(r,'prospectNotes') && (typeof r.prospectNotes !== 'string' || r.prospectNotes.length > 500)) throw Error('Invalid prospect notes.');
  if (Object.hasOwn(r,'addressSourceType') && !Object.hasOwn(addressSourceTypes,r.addressSourceType)) throw Error('Invalid address source type.');
  if (Object.hasOwn(r,'exterior')) {
    const e=r.exterior;
    if(!e||Object.keys(e).length!==4||Object.keys(e).some(k=>!['route','reason','source','reviewedOn'].includes(k))||!Object.hasOwn(exteriorRoutes,e.route)||typeof e.reason!=='string'||!e.reason.trim()||e.reason.length>500||typeof e.source!=='string'||!day(e.reviewedOn))throw Error('Invalid exterior qualification.');
    const u=new URL(e.source);if(u.protocol!=='https:'||u.username||u.password)throw Error('Exterior evidence must use public HTTPS URLs.');
  }
  if (!Number.isSafeInteger(r.id) || r.id < 1 || !Object.hasOwn(mailingCategories,r.category)) throw Error('Invalid mailing recipient identity.');
  for (const k of fields.filter(k => k !== 'id')) if (typeof r[k] !== 'string' || r[k].length > 500) throw Error('Invalid mailing recipient text.');
  if (!r.name.trim() || !['published','needs_review'].includes(r.status) || r.country !== 'US') throw Error('Invalid mailing recipient.');
  if (r.source) { const u = new URL(r.source); if (u.protocol !== 'https:' || u.username || u.password) throw Error('Mailing sources must be public HTTPS URLs.'); }
  if (r.reviewedOn && !day(r.reviewedOn)) throw Error('Invalid address review date.');
  if (r.status === 'published' && (!r.source || !r.reviewedOn || !completeAddress(r))) throw Error('Reviewed addresses require complete fields, a source and a review date.');
  return r;
}
export function completeAddress(r) { return !!(clean(r.name) && clean(r.address1) && clean(r.city) && /^[A-Z]{2}$/.test(r.state) && /^\d{5}(-\d{4})?$/.test(r.zip)); }
export function mergeMailingCatalog(recipients,companies){
  const byId=new Map(companies.map(c=>[c.id,c])),seen=new Set();
  for(const r of recipients){validateRecipient(r);if(seen.has(r.id))throw Error('Duplicate mailing identity.');seen.add(r.id);const c=byId.get(r.id);if(r.id<1000000&&(!c||c.name!==r.name||c.category!==r.category))throw Error('Mailing record does not match its CRM company.');if(r.id>=1000000&&c)throw Error('Mailing identity collides with CRM.');}
  return [...recipients,...companies.filter(c=>!seen.has(c.id)).map(c=>({id:c.id,name:c.name,category:c.category,attention:'',address1:'',address2:'',city:c.city||'',state:c.state||'',zip:c.zip||'',country:'US',source:'',reviewedOn:'',status:'needs_review'}))];
}
const norm = v => clean(v).toUpperCase().replace(/[.,]/g,'').replace(/\b(STREET|ROAD|AVENUE|BOULEVARD|DRIVE|LANE|PARKWAY|HIGHWAY|SUITE)\b/g,v=>({STREET:'ST',ROAD:'RD',AVENUE:'AVE',BOULEVARD:'BLVD',DRIVE:'DR',LANE:'LN',PARKWAY:'PKWY',HIGHWAY:'HWY',SUITE:'STE'}[v])).replace(/#/g,'STE ').replace(/\s+/g,' ').trim();
export const addressKey = r => [norm([r.address1,r.address2].filter(Boolean).join(' ')).replace(/\b(?:STE|SUITE)\s*(?=[A-Z0-9])/g,'STE ').replace(/\bSTE\s+STE\b/g,'STE'),norm(r.city),clean(r.state),clean(r.zip).slice(0,5)].join('|');
export const recipientKey = r => norm(r.name)+'|'+addressKey(r);
export const exportRow = r => [r.name,r.attention,r.address1,r.address2,r.city,r.state,r.zip,r.country];
export const defaultFilters = () => ({categories:['dentist','school'],cities:[],zips:'',search:'',excludeDays:0,onePerAddress:false,excluded:[],area:'',exterior:'',sourceType:''});
export function validateFilters(f) {
  if(f?.area!==undefined&&f.area!==''&&!mailingAreas.some(a=>a.id===f.area))throw Error('Invalid research area.');
  if(f?.exterior!==undefined&&f.exterior!==''&&!Object.hasOwn(exteriorRoutes,f.exterior))throw Error('Invalid exterior approval filter.');
  if(f?.sourceType!==undefined&&f.sourceType!==''&&!Object.hasOwn(addressSourceTypes,f.sourceType))throw Error('Invalid address source filter.');
  if (!f || !Array.isArray(f.categories) || f.categories.some(k=>!Object.hasOwn(mailingCategories,k)) || !Array.isArray(f.cities) || f.cities.some(c=>typeof c!=='string'||c.length>100) || typeof f.zips!=='string' || f.zips.length>500 || typeof f.search!=='string' || f.search.length>500 || ![0,30,60,90,180].includes(f.excludeDays) || typeof f.onePerAddress!=='boolean' || !Array.isArray(f.excluded) || f.excluded.some(id=>!Number.isSafeInteger(id)||id<1)) throw Error('Invalid saved mailing filters.');
  parseZips(f.zips); return f;
}
export function parseZips(value) {
  const zips = value.split(/[\s,;]+/).filter(Boolean);
  if (zips.some(z=>!/^\d{5}$/.test(z))) throw Error('Enter five-digit ZIP codes separated by commas or spaces.');
  return zips;
}
export function selectRecipients(catalog, filters, suppressed=[], lastMailed=()=>null, today) {
  validateFilters(filters); const zips=parseZips(filters.zips), blocked=new Set(suppressed), excluded=new Set(filters.excluded), seen=new Set(), rows=[], held=[];
  const blockedKeys=new Set(catalog.filter(r=>blocked.has(r.id)).map(recipientKey));
  const candidates = catalog.filter(r=>(!filters.sourceType||r.addressSourceType===filters.sourceType)&&filters.categories.includes(r.category) && (!filters.area||mailingArea(r)===filters.area) && (!filters.exterior||(r.exterior?.route||'unknown')===filters.exterior) && (!filters.cities.length||filters.cities.includes(r.city)) && (!zips.length||zips.includes(r.zip.slice(0,5))) && (!filters.search||[r.name,r.city,r.address1,r.address2].join(' ').toLowerCase().includes(filters.search.toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name)||a.id-b.id);
  for (const r of candidates) {
    let reason=''; const last=lastMailed(r.id);
    if (blocked.has(r.id)||blockedKeys.has(recipientKey(r))) reason='Do not mail';
    else if (!completeAddress(r)||r.status!=='published') reason='Address needs review';
    else if (filters.excludeDays&&last&&(Date.parse(today+'T12:00:00Z')-Date.parse(last+'T12:00:00Z'))/86400000<=filters.excludeDays) reason='Recently mailed';
    else if (excluded.has(r.id)) reason='Excluded from this list';
    const key=filters.onePerAddress?addressKey(r):recipientKey(r);
    if (!reason&&seen.has(key)) reason=filters.onePerAddress?'Same delivery address':'Duplicate business/address';
    if (reason) held.push({recipient:r,reason}); else { seen.add(key); rows.push(r); }
  }
  return {rows,held,candidates};
}
export function csvFor(rows) {
  const cell = v => '"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replaceAll('"','""')+'"';
  return '\ufeff'+[exportHeaders,...rows.map(exportRow)].map(row=>row.map(cell).join(',')).join('\r\n');
}
