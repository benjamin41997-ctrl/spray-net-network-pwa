export const visitLabels={walk_in:'Drop-in stop',call_first:'Call first',appointment_only:'Appointment only',home_based:'Home-based · no drop-ins',no_public_office:'No visitor office',closed:'Location closed',unknown:'Visit unverified · call first'};
export const unknownVisit={status:'unknown',summary:'A listed city or registered address does not confirm a visitor office. Call before making a trip.',address:null,hours:null,checkedAt:null,sources:[]};
export const visitInfo=company=>company.visit||unknownVisit;
export function validateVisit(v){
 const keys=Object.keys(unknownVisit);
 if(!v||Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k))||!Object.hasOwn(visitLabels,v.status)||typeof v.summary!=='string'||!v.summary.trim())throw Error('Invalid public visit policy');
 for(const k of ['address','hours'])if(v[k]!==null&&typeof v[k]!=='string')throw Error('Invalid visit text');
 if(v.address&&!['walk_in','call_first','appointment_only'].includes(v.status))throw Error('Unsafe visitor address');
 if(v.status==='walk_in'&&!v.address)throw Error('Drop-in stops need a reviewed visitor address');
 if(!Array.isArray(v.sources))throw Error('Visit sources required');
 for(const source of v.sources){const u=new URL(source);if(u.protocol!=='https:'||u.username||u.password||['localhost','127.0.0.1'].includes(u.hostname))throw Error('Invalid public visit source');}
 if(v.status!=='unknown'||v.checkedAt!==null||v.sources.length){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v.checkedAt||'')||!Number.isFinite(Date.parse(v.checkedAt))||!v.sources.length)throw Error('Dated visit evidence required');
 }
}
