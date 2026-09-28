export const platforms={instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',linkedin:'LinkedIn',youtube:'YouTube'};
const hosts={instagram:'instagram.com',facebook:'facebook.com',tiktok:'tiktok.com',linkedin:'linkedin.com',youtube:'youtube.com'};
export function accountUrl(raw){
 try{
  const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port)return null;
  const host=u.hostname.toLowerCase().replace(/^(www\.|m\.|web\.)/,'');
  const platform=Object.keys(hosts).find(k=>hosts[k]===host);if(!platform)return null;
  const parts=u.pathname.split('/').filter(Boolean);let path='';
  if(platform==='facebook'&&parts[0]==='profile.php'&&/^\d+$/.test(u.searchParams.get('id')||''))path='profile.php?id='+u.searchParams.get('id');
  else if(platform==='facebook'&&parts[0]==='pages'&&parts.length===3&&/^\d+$/.test(parts[2]))path='profile.php?id='+parts[2];
  else if(platform==='facebook'&&parts[0]==='people'&&parts.length===3&&/^\d+$/.test(parts[2]))path='profile.php?id='+parts[2];
  else if(['instagram','facebook'].includes(platform)&&parts.length===1&&/^[A-Za-z0-9_.-]+$/.test(parts[0])&&!['p','reel','reels','stories','explore','accounts','direct','share','sharer','sharer.php','dialog','login','watch','groups','events','pages','profile.php','intent','plugins','hashtag','search'].includes(parts[0].toLowerCase()))path=parts[0].toLowerCase();
  else if(platform==='tiktok'&&parts.length===1&&/^@[A-Za-z0-9_.]+$/.test(parts[0]))path=parts[0].toLowerCase();
  else if(platform==='linkedin'&&parts.length===2&&parts[0]==='company'&&/^[A-Za-z0-9_-]+$/.test(parts[1]))path=parts.join('/').toLowerCase();
  else if(platform==='youtube'&&((parts.length===1&&/^@[A-Za-z0-9_.-]+$/.test(parts[0]))||(parts.length===2&&['channel','user','c'].includes(parts[0])&&/^[A-Za-z0-9_-]+$/.test(parts[1]))))path=parts.join('/');
  return path?{platform,url:'https://www.'+host+'/'+path}:null;
 }catch{return null}
}
export function validateSocial(data,companies){
 if(data?.schemaVersion!==1||!Array.isArray(data.reviews))throw Error('Unsupported social research.');
 const ids=new Set(companies.map(c=>c.id)),seen=new Set();
 for(const r of data.reviews){
  if(!ids.has(r.companyId)||seen.has(r.companyId)||!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedOn)||!['checked','blocked'].includes(r.status)||typeof r.notes!=='string'||r.notes.length>1500||!Array.isArray(r.accounts)||!Array.isArray(r.sources))throw Error('Invalid social research record.');
  seen.add(r.companyId);const accounts=new Set();
  for(const source of r.sources){const u=new URL(source);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid social source.');}
  for(const a of r.accounts){const canonical=accountUrl(a.url);if(!canonical||canonical.url!==a.url||canonical.platform!==a.platform||accounts.has(a.url)||!['website_linked','possible'].includes(a.evidence)||!['business','brand','unclear'].includes(a.scope)||!r.sources.includes(a.source)||typeof a.notes!=='string'||a.notes.length>1000)throw Error('Invalid business social account.');accounts.add(a.url);}
 }
 return data;
}
export function socialCompanies(directory,mailing){
 const byId=new Map(directory.companies.map(c=>[c.id,{...c}]));
 for(const r of mailing.recipients){const c=byId.get(r.id);if(!c)byId.set(r.id,{id:r.id,name:r.name,city:r.city,state:r.state,category:r.category,website:r.addressSourceType==='company_website'?r.source:'',shortlist:null});else if(!c.city&&r.city)c.city=r.city;}
 return [...byId.values()];
}
export const searchUrl=(c,platform)=>'https://www.google.com/search?q='+encodeURIComponent('site:'+hosts[platform]+' '+c.name+' '+(c.city||'')+' '+(c.state||'')+' official');
export const progressKey=(profile,url)=>profile.trim().toLowerCase()+'\n'+url;
