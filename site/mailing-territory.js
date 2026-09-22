// Postal aliases group research areas without rewriting mailing addresses.
export const mailingAreas = [
  ['fort_mill','Fort Mill','SC',['Fort Mill']],['tega_cay','Tega Cay','SC',['Tega Cay']],
  ['rock_hill','Rock Hill','SC',['Rock Hill']],['indian_land','Indian Land','SC',['Indian Land']],
  ['lake_wylie','Lake Wylie / Clover','SC',['Lake Wylie','Clover']],
  ['ballantyne','Ballantyne / 28277','NC',['Ballantyne']],['charlotte','Charlotte (other)','NC',['Charlotte']],
  ['pineville','Pineville','NC',['Pineville']],['matthews','Matthews','NC',['Matthews']],
  ['mint_hill','Mint Hill','NC',['Mint Hill']],['waxhaw','Waxhaw','NC',['Waxhaw']],
  ['weddington','Weddington','NC',['Weddington']],['marvin','Marvin','NC',['Marvin']],
  ['indian_trail','Indian Trail','NC',['Indian Trail']],['belmont','Belmont','NC',['Belmont']],
  ['mount_holly','Mount Holly','NC',['Mount Holly','Mt Holly','Mt. Holly']],
  ['gastonia','Gastonia','NC',['Gastonia']],['cramerton','Cramerton','NC',['Cramerton']],
  ['mcadenville','McAdenville','NC',['McAdenville']],['lowell','Lowell','NC',['Lowell']],
  ['regional','Other regional offices','',[]]
].map(([id,label,state,cities])=>({id,label,state,cities}));
export function mailingArea(r){
  if(r.state==='SC'&&r.zip?.slice(0,5)==='29707')return 'indian_land';
  if(r.state==='NC'&&r.zip?.slice(0,5)==='28277')return 'ballantyne';
  return mailingAreas.find(a=>a.state===r.state&&a.cities.some(c=>c.toLowerCase()===r.city?.toLowerCase()))?.id||'regional';
}
export function coverageCounts(catalog,category){
  return mailingAreas.map(a=>{const rows=catalog.filter(r=>r.category===category&&mailingArea(r)===a.id);return {...a,ready:rows.filter(r=>r.status==='published').length,held:rows.filter(r=>r.status!=='published').length};});
}
