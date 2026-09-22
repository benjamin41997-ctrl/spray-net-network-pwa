export const ratingOptions = {
  opportunity:{unknown:'Opportunity unknown',high:'High exterior opportunity',moderate:'Potential exterior opportunity',limited:'Limited exterior opportunity'},
  access:{unknown:'Decision-maker unknown',local_owner:'Local business owner identified',property_manager:'Landlord / property manager identified',central_facilities:'Central facilities route',tenant:'Tenant — landlord approval needed',business_approves:'Business confirms exterior authority'},
  evidence:{unknown:'Evidence unknown',website:'Business website checked',corroborated:'Corroborated public sources',registry:'Registry evidence only',unresolved:'Conflicting / incomplete evidence',direct:'Firsthand finding recorded'},
  visit:{unknown:'Visit suitability unknown',walk_in:'Public-facing — brief visit possible',appointment:'Arrange an appointment',home_based:'Home-based — do not drop in'}
};
export const ratingLabels={opportunity:'Exterior opportunity',access:'Decision-maker access',evidence:'Evidence confidence',visit:'Visit suitability'};
export const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function publicUrl(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
export function validateProspect(p){
  if(!p||Object.keys(p).some(k=>!Object.hasOwn(ratingOptions,k)))throw Error('Invalid prospect ratings.');
  for(const [key,r] of Object.entries(p)){
    if(!r||Object.keys(r).length!==4||Object.keys(r).some(k=>!['value','reason','source','reviewedOn'].includes(k))||!Object.hasOwn(ratingOptions[key],r.value)||r.value==='direct'||typeof r.reason!=='string'||!r.reason.trim()||r.reason.length>1000||!publicUrl(r.source)||!validDay(r.reviewedOn))throw Error('A public rating needs valid evidence, reasoning and a review date.');
  }
}
export function validateProperty(p){
  if(!p||Object.keys(p).length!==7||Object.keys(p).some(k=>!['status','owner','parcelId','source','reviewedOn','relationship','notes'].includes(k))||!['matched','unresolved'].includes(p.status)||!['unknown','documented'].includes(p.relationship)||!publicUrl(p.source)||!validDay(p.reviewedOn))throw Error('Invalid property research.');
  for(const k of ['owner','parcelId','notes'])if(typeof p[k]!=='string'||p[k].length>1000)throw Error('Invalid property evidence.');
  if(!p.notes.trim()||(p.status==='matched'&&(!p.owner.trim()||!p.parcelId.trim())))throw Error('A matched property needs its recorded owner and parcel.');
}
export function validateFindings(f){
  if(!f||Object.keys(f).some(k=>!['opportunity','access','visit','reason'].includes(k))||typeof f.reason!=='string'||!f.reason.trim()||f.reason.length>1000)throw Error('Explain what you learned firsthand.');
  const fields=Object.keys(f).filter(k=>k!=='reason');
  if(!fields.length||fields.some(k=>!Object.hasOwn(ratingOptions[k],f[k])))throw Error('Choose at least one firsthand finding.');
}
// Resolve each field independently: a later visit finding must not erase an earlier access finding.
export function latestFindings(records,id){
  const result={};
  const ordered=records.filter(r=>r.companyId===id&&!r.deletedAt&&r.findings).sort((a,b)=>b.occurredOn.localeCompare(a.occurredOn)||b.updatedAt.localeCompare(a.updatedAt)||b.id.localeCompare(a.id));
  for(const r of ordered)for(const key of ['opportunity','access','visit'])if(Object.hasOwn(r.findings,key)&&!result[key])result[key]={value:r.findings[key],reason:r.findings.reason,reviewedOn:r.occurredOn,source:'',activityId:r.id,firsthand:true};
  return result;
}
export function prospectRatings(r,findings={}){
  const make=(value,reason,source=r.source||'',reviewedOn=r.reviewedOn||'')=>({value,reason,source,reviewedOn});
  const result={
    opportunity:make('unknown','Exterior surfaces, size and condition have not been assessed.'),
    access:make('unknown','The person who can approve exterior work has not been established.'),
    evidence:make(r.status!=='published'?'unresolved':r.addressSourceType==='company_website'?'website':['healthcare_registry','licensing'].includes(r.addressSourceType)?'registry':'unknown',r.status!=='published'?'Address or identity still needs review.':r.addressSourceType==='company_website'?'The business publishes this address; occupancy and exterior authority have not been independently confirmed.':['healthcare_registry','licensing'].includes(r.addressSourceType)?'Public registry address; current occupancy needs corroboration.':'Address source recorded; independent corroboration remains to be done.'),
    visit:make('unknown','A public mailing address does not establish walk-in access.')
  };
  if(r.exterior?.route==='central_facilities')result.access=make('central_facilities',r.exterior.reason,r.exterior.source,r.exterior.reviewedOn);
  Object.assign(result,r.prospect||{});
  Object.assign(result,findings);
  if(Object.keys(findings).length){const newest=Object.values(findings).sort((a,b)=>b.reviewedOn.localeCompare(a.reviewedOn))[0];result.evidence={...newest,value:'direct',reason:'Firsthand information applies only to the marked fields. Address, title ownership and other public facts are not automatically verified.'};}
  return result;
}
export function approvalRoute(r,findings={}){
  const access=findings.access?.value;
  if(access==='tenant')return 'likely_landlord';
  if(access==='business_approves')return 'likely_business';
  if(access==='central_facilities')return 'central_facilities';
  if(access==='unknown')return 'unknown';
  return r.exterior?.route||'unknown';
}
