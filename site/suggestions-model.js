export const reviewStatuses={new:'New',researching:'Researching',ready:'Ready for directory review',added:'Added to network',duplicate:'Already in network',not_fit:'Not a fit'};
export const fields={business:160,contact:160,city:120,category:120,website:500,email:254,phone:80,suggestedBy:160,notes:3000};
export const format='spray-net-contact-suggestions';
export function validateConfig(c){
 if(!c||Object.keys(c).some(k=>!['version','endpoint'].includes(k))||c.version!==1||typeof c.endpoint!=='string'||(c.endpoint&&!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(c.endpoint)))throw Error('Invalid suggestion inbox configuration.');
 return c;
}
export function validateRecords(records){
 if(!Array.isArray(records)||records.length>10000)throw Error('Choose a suggestion file with at most 10,000 entries.');
 const ids=new Set(),keys=['id','createdAt','updatedAt','status','reviewNotes','companyId','delivery',...Object.keys(fields)];
 for(const r of records){
  if(!r||Object.keys(r).some(k=>!keys.includes(k))||typeof r.id!=='string'||!/^suggestion-[a-zA-Z0-9-]{10,80}$/.test(r.id)||ids.has(r.id))throw Error('Invalid or duplicate suggestion ID.');
  ids.add(r.id);
  for(const [field,max] of Object.entries(fields))if(typeof r[field]!=='string'||r[field].length>max)throw Error('Invalid suggestion field: '+field);
  if(!r.business.trim()&&!r.contact.trim())throw Error('Enter a business or contact name.');
  if(r.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))throw Error('Check the email address.');
  if(r.website){let url;try{url=new URL(r.website)}catch{throw Error('Use a complete website URL, starting with https://.')}if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Use a public http or https website URL.');}
  for(const k of ['createdAt','updatedAt'])if(typeof r[k]!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(r[k])||!Number.isFinite(Date.parse(r[k])))throw Error('Invalid suggestion date.');
  if(r.updatedAt<r.createdAt||!Object.hasOwn(reviewStatuses,r.status)||typeof r.reviewNotes!=='string'||r.reviewNotes.length>6000||!['local','accepted','uncertain'].includes(r.delivery)||!(r.companyId===null||Number.isSafeInteger(r.companyId)&&r.companyId>0))throw Error('Invalid suggestion review.');
  if(['added','duplicate'].includes(r.status)&&r.companyId===null)throw Error('Select the existing directory business for this status.');
 }
 return records;
}
export function newSuggestion(input){
 const now=new Date().toISOString(),r={id:'suggestion-'+crypto.randomUUID(),createdAt:now,updatedAt:now,status:'new',reviewNotes:'',companyId:null,delivery:'local'};
 for(const k of Object.keys(fields))r[k]=String(input[k]||'').trim();
 return validateRecords([r])[0];
}
export function bundle(records){return {format,version:1,records:validateRecords(records)};}
export function parseSuggestions(text){
 const b=JSON.parse(text);
 if(b?.format===format&&b.version===1)return validateRecords(b.records);
 // Formspree's optional JSON export stores the original portable record in a text field.
 if(Array.isArray(b?.submissions)){
  if(b.submissions.length>10000)throw Error('Inbox export is too large.');
  const found=new Map();
  for(const s of b.submissions){const v=JSON.parse(s.suggestion);if(v.format!==format||v.version!==1||!Array.isArray(v.records))throw Error('Unrecognized inbox suggestion.');
   for(const r of v.records){const row=validateRecords([{...r,status:'new',reviewNotes:'',companyId:null,delivery:'accepted'}])[0],old=found.get(row.id);
    if(old&&['createdAt',...Object.keys(fields)].some(k=>old[k]!==row[k]))throw Error('Conflicting submissions share one suggestion ID. Review them separately.');
    if(!old)found.set(row.id,row);
   }
  }
  return validateRecords([...found.values()]);
 }
 throw Error('Choose a Contact Suggestions file.');
}
export function possibleMatches(record,companies){
 const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const query=normalize(record.business),person=normalize(record.contact);
 return companies.filter(c=>query.length>=3&&(normalize(c.name).includes(query)||query.includes(normalize(c.name)))||person.length>=3&&(c.people||[]).some(p=>normalize(p.name)===person)).slice(0,8);
}
