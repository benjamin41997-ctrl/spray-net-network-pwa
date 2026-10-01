import {test,expect} from '@playwright/test';
const url='http://127.0.0.1:4174/spray-net-network-pwa/';
const project='https://dkrbsodejmqbcnldgkph.supabase.co';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const social={profile:'Spray-Net Instagram',url:'https://www.instagram.com/renttailored',status:'followed',updatedAt:'2026-09-28T12:00:00.000Z'};
function fakeServer(){
 const records=new Map(),mutations=new Set();let conflict=false,drop=false,commits=0;
 return {records,mutations,get commits(){return commits},set conflict(v){conflict=v},set drop(v){drop=v},async install(context,id){
  await context.addInitScript(({id})=>{if(!localStorage.getItem('test-session-seeded')){const exp=Math.floor(Date.now()/1000)+3600;const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:id,role:'authenticated',exp}))+'.signature';localStorage.setItem('spray-net-team-mode','team');localStorage.setItem('spray-net-team-auth',JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:exp,user:{id,email:'test@example.test',aud:'authenticated',role:'authenticated'}}));localStorage.setItem('test-session-seeded','true');}},{id});
  await context.route(project+'/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.startsWith('/auth/')){await route.fulfill({json:{id,email:'test@example.test'}});return;}
   if(path.endsWith('/network_commit')){commits++;const input=route.request().postDataJSON();if(!mutations.has(input.p_mutation)){
    if(conflict||input.p_changes.some(c=>(records.get(c.kind+'\n'+c.key)?.revision||0)!==c.expected)){await route.fulfill({status:409,json:{code:'40001',message:'SYNC_CONFLICT'}});return;}
    for(const c of input.p_changes)records.set(c.kind+'\n'+c.key,{kind:c.kind,record_key:c.key,payload:c.payload,revision:c.expected+1,updated_by:id,updated_at:new Date().toISOString()});mutations.add(input.p_mutation);
   }if(drop){drop=false;await route.abort();return;}}
   await route.fulfill({json:{member:'Test teammate',records:[...records.values()]}});
  });
 }};
}
test('team follows sync across devices, preserve offline changes, and distinguish social account labels',async({browser},info)=>{
 test.skip(info.project.name!=='desktop','Two-device transport check runs once');
 const server=fakeServer(),a=await browser.newContext({baseURL:url,serviceWorkers:'block'}),b=await browser.newContext({baseURL:url,serviceWorkers:'block'});
 try{await server.install(a,ids[0]);await server.install(b,ids[1]);const pa=await a.newPage(),pb=await b.newPage();await pa.goto('./#social?company=2');await pb.goto('./#social?company=2');
  await pa.locator('#social-profile').fill(social.profile);await pa.locator('#social-profile').press('Tab');await pa.locator('[data-social-url]').selectOption('followed');await expect.poll(()=>server.records.size).toBe(1);
  await pb.reload();await expect(pb.locator('#social-profile')).toHaveValue(social.profile);await expect(pb.locator('[data-social-url]')).toHaveValue('followed');
  await b.setOffline(true);await pb.locator('[data-social-url]').selectOption('skip');await expect(pb.locator('#social-message')).toContainText('saved');expect([...server.records.values()][0].payload.status).toBe('followed');
  await b.setOffline(false);await expect.poll(()=>[...server.records.values()][0].payload.status).toBe('skip');await pa.reload();await expect(pa.locator('[data-social-url]')).toHaveValue('skip');
  await pa.locator('#social-profile').fill('Personal Instagram');await pa.locator('#social-profile').press('Tab');await expect(pa.locator('[data-social-url]')).toHaveValue('pending');
 }finally{await a.close();await b.close();}
});
test('unknown delivery retries identical mutation, conflicts retain edits, and latest team version can be chosen',async({browser},info)=>{
 test.skip(info.project.name!=='desktop','Transport failure check runs once');
 const server=fakeServer(),context=await browser.newContext({baseURL:url,serviceWorkers:'block'});
 try{await server.install(context,ids[0]);const page=await context.newPage();await page.goto('./#social?company=2');server.drop=true;await page.locator('[data-social-url]').selectOption('followed');await expect.poll(()=>server.mutations.size).toBe(1);
  await page.getByRole('button',{name:/Team sync/}).click();await expect(page.locator('#team-error')).not.toBeEmpty();await page.getByRole('button',{name:'Sync now',exact:true}).click();await expect(page.locator('#team-status')).toHaveText('Team data synced');expect(server.mutations.size).toBe(1);expect([...server.records.values()][0].revision).toBe(1);
  await page.goto('./#social?company=2');server.conflict=true;await page.locator('[data-social-url]').selectOption('skip');await page.getByRole('button',{name:/Team sync/}).click();await expect(page.locator('#team-conflict')).toBeVisible();expect([...server.records.values()][0].payload.status).toBe('followed');
  server.conflict=false;page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Keep latest team versions'}).click();await expect(page.locator('#team-status')).toHaveText('Team data synced');await page.goto('./#social?company=2');await expect(page.locator('[data-social-url]')).toHaveValue('followed');
 }finally{await context.close();}
});
test('local migration is explicit, new IDs are shared once, and existing team records win',async({browser},info)=>{
 test.skip(info.project.name!=='desktop','Migration check runs once');
 const server=fakeServer(),context=await browser.newContext({baseURL:url,serviceWorkers:'block'});
 try{await server.install(context,ids[0]);const page=await context.newPage();await page.goto('./#team');await page.evaluate(async social=>{const store=await import('./social-store.js');const r=indexedDB.open('spray-net-social-progress',1);await new Promise((resolve,reject)=>{r.onupgradeneeded=()=>r.result.createObjectStore('progress');r.onsuccess=resolve;r.onerror=reject;});await new Promise((resolve,reject)=>{const tx=r.result.transaction('progress','readwrite');tx.objectStore('progress').put(social,social.profile.toLowerCase()+'\n'+social.url);tx.oncomplete=resolve;tx.onerror=reject;});},social);
  expect(server.records.size).toBe(0);await page.getByRole('button',{name:'Preview device-only records'}).click();await expect(page.locator('#team-migration')).toContainText('Social follow records: 1');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Upload selected records to the team'}).click();await expect.poll(()=>server.records.size).toBe(1);await expect(page.locator('#team-message')).toContainText('Queued 1');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Upload selected records to the team'}).click();await expect(page.locator('#team-message')).toContainText('preserved 1');expect(server.records.size).toBe(1);
 }finally{await context.close();}
});
test('unapproved accounts cannot use shared records or silently fall back to device data',async({browser},info)=>{
 test.skip(info.project.name!=='desktop','Access failure check runs once');
 const context=await browser.newContext({baseURL:url,serviceWorkers:'block'}),server=fakeServer();
 try{await server.install(context,ids[0]);await context.route(project+'/rest/v1/rpc/**',r=>r.fulfill({status:403,json:{code:'42501',message:'Team access not approved'}}));const page=await context.newPage();await page.goto('./#team');await expect(page.locator('#team-error')).toContainText('not approved');await page.goto('./#social?company=2');await expect(page.locator('[data-social-url]')).toBeDisabled();await expect(page.locator('#social-storage')).toContainText('status is unknown');
 }finally{await context.close();}
});
test('team suggestions, outreach and mailing settings reach a second device without file handoff',async({browser})=>{
 const server=fakeServer(),a=await browser.newContext({baseURL:url,serviceWorkers:'block'}),b=await browser.newContext({baseURL:url,serviceWorkers:'block'});
 try{await server.install(a,ids[0]);await server.install(b,ids[1]);const pa=await a.newPage(),pb=await b.newPage();
  await pa.goto('./#suggest');await pa.locator('#suggestion-form [name="business"]').fill('Family referral');await pa.getByRole('button',{name:'Save team suggestion'}).click();await expect.poll(()=>[...server.records.values()].filter(r=>r.kind==='suggestion').length).toBe(1);
  await pa.goto('./#tracker');await pa.locator('#tracker .log-details > summary').click();await pa.locator('#tracker [name="companyId"]').selectOption('2');await pa.locator('#tracker [name="notes"]').fill('Shared visit history');await pa.getByRole('button',{name:'Save activity',exact:true}).click();await expect.poll(()=>[...server.records.values()].filter(r=>r.kind==='activity').length).toBe(1);
  await pa.goto('./#mailing');await pa.getByLabel('List name',{exact:true}).fill('Team mail list');await pa.getByRole('button',{name:'Save list filters'}).click();await expect.poll(()=>[...server.records.values()].filter(r=>r.kind==='mailing').length).toBe(1);
  await pb.goto('./#suggest');await expect(pb.locator('[data-suggestion]')).toContainText('Family referral');await pb.goto('./#tracker');await expect(pb.locator('.activity-entry')).toContainText('Shared visit history');await pb.goto('./#mailing');await pb.getByLabel('Load a saved list').selectOption('Team mail list');await expect(pb.getByLabel('List name',{exact:true})).toHaveValue('Team mail list');
  await pb.goto('./#team');expect(await pb.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await a.close();await b.close();}
});
test('directory findings sync to another approved device',async({browser},info)=>{
 test.skip(info.project.name!=='desktop','Two-device verification runs once');
 const server=fakeServer(),a=await browser.newContext({baseURL:url,serviceWorkers:'block'}),b=await browser.newContext({baseURL:url,serviceWorkers:'block'});
 try{await server.install(a,ids[0]);await server.install(b,ids[1]);const pa=await a.newPage(),pb=await b.newPage();
 await pa.goto('./#verification');await pa.locator('#verification-form [name=company]').selectOption('2');await pa.locator('#verification-form [name=evidence]').fill('Office manager confirmed a new mailing suite.');await pa.getByRole('button',{name:'Save finding',exact:true}).click();await expect.poll(()=>[...server.records.values()].filter(r=>r.kind==='activity').length).toBe(1);
 await pb.goto('./#verification');await expect(pb.locator('#verification')).toContainText('Office manager confirmed a new mailing suite.');
 }finally{await a.close();await b.close();}
});
