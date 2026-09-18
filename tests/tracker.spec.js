import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {today,parseBackup,validateActivity,summary} from '../site/tracker-store.js';

const seed=(extra={})=>({id:'test-activity-1',companyId:2,companyName:'Tailored Homes Property Management',contactId:null,contactName:'',recipient:'Office manager',type:'email',delivery:'email',occurredOn:'2026-09-01',material:'Introduction',notes:'Asked about vendor intake',outcome:'Awaiting reply',followUpOn:today(),followUpDone:false,createdAt:'2026-09-01T12:00:00.000Z',updatedAt:'2026-09-01T12:00:00.000Z',deletedAt:null,...extra});
const backup=rows=>JSON.stringify({format:'spray-net-outreach',version:1,activities:rows});
async function importBackup(page,rows){
 await page.locator('#backup-import').setInputFiles({name:'history.json',mimeType:'application/json',buffer:Buffer.from(backup(rows))});
 await page.getByRole('button',{name:'Merge backup',exact:true}).click();
 await expect(page.locator('#backup-status')).toContainText('Imported');
}
async function openForm(page){await page.locator('section:not([hidden]) .log-details > summary').click();return page.locator('section:not([hidden]) > .activity-form, section:not([hidden]) .activity-form').filter({visible:true}).first()}

test('logs recipient, material and follow-up; preserves history offline; excludes contacted businesses',async({page,context,browserName})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const sent=[];
 page.on('request',r=>{if(r.method()!=='GET')sent.push(r.url())});
 await page.goto('./#company/2');
 await expect(page.locator('#profile .empty-history')).toContainText('No completed activities');
 const form=await openForm(page);
 await form.locator('[name=type]').selectOption('one_pager');
 await form.locator('[name=contactId]').selectOption({label:'Whitney Whitesides'});
 await form.locator('[name=recipient]').fill('Whitney at the front office');
 await form.locator('[name=occurredOn]').fill(today());
 await form.locator('[name=delivery]').selectOption('in_person');
 await form.locator('[name=material]').fill('Cabinet one-pager v2');
 await form.locator('[name=notes]').fill('Left a printed sheet after our meeting.');
 await form.locator('[name=followUpOn]').fill(today());
 await form.getByRole('button',{name:'Save activity',exact:true}).click();
 await expect(form.locator('.form-message')).toHaveText('Activity saved in this browser.');
 await expect(page.locator('#profile .activity-entry')).toContainText('Whitney Whitesides');
 await expect(page.locator('#profile .activity-entry')).toContainText('Cabinet one-pager v2');
 await expect(page.locator('#profile .touch-summary')).toContainText('1 follow-up due');
 await expect(page.locator('#connection')).toHaveText('Ready offline');
 await page.reload();if(browserName!=='webkit'){await context.setOffline(true);await page.reload()}
 await expect(page.locator('#profile .activity-entry')).toContainText('Left a printed sheet');
 await page.getByRole('button',{name:'Back to directory'}).click();
 await page.locator('#outreach').selectOption('due');await expect(page.locator('#result-count')).toHaveText('1 company');
 await expect(page.locator('#cards')).toContainText('Tailored Homes');
 await page.locator('#outreach').selectOption('untouched');await expect(page.locator('#cards')).not.toContainText('Tailored Homes');
 await page.locator('#outreach').selectOption('recent');await expect(page.locator('#result-count')).toHaveText('1 company');
 await page.getByRole('link',{name:'Tailored Homes Property Management',exact:true}).click();
 await page.getByRole('button',{name:'Complete follow-up',exact:true}).click();
 await expect(page.locator('#profile .activity-entry')).toContainText('Complete');
 await expect(page.locator('#profile .touch-summary')).not.toContainText('follow-up due');
 await context.setOffline(false);expect(errors).toEqual([]);expect(sent).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('edits, warns for repeat materials, removes and restores without double-counting',async({page})=>{
 await page.goto('./#tracker');await importBackup(page,[seed()]);
 await page.locator('#tracker .activity-entry').getByRole('button',{name:'Edit',exact:true}).click();
 const form=page.locator('#tracker form');await form.locator('[name=material]').fill('One-pager v3');
 await form.locator('[name=type]').selectOption('direct_mail');await form.locator('[name=delivery]').selectOption('postal');
 await form.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.locator('#tracker .activity-entry')).toHaveCount(1);
 await expect(page.locator('#tracker .activity-entry')).toContainText('Direct mail sent');
 await form.locator('[name=companyId]').selectOption('2');await form.locator('[name=material]').fill('One-pager v3');
 await expect(form.locator('.repeat-warning')).toContainText('Already logged');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'About',exact:true}).click();
 await page.getByRole('button',{name:'Tracker',exact:true}).click();
 await page.locator('#tracker .activity-entry').getByRole('button',{name:'Remove',exact:true}).click();
 await expect(page.locator('#tracker .activity-entry')).toHaveCount(0);
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(page.locator('#tracker .activity-entry')).toHaveCount(1);
 await page.locator('#tracker .activity-entry').getByRole('button',{name:'Remove',exact:true}).click();
 await expect(page.locator('#tracker .activity-entry')).toHaveCount(0);
 await page.reload();await page.locator('.show-removed').check();
 await expect(page.locator('#tracker .activity-entry')).toContainText('Removed');
 await page.getByRole('button',{name:'Restore',exact:true}).click();
 await expect(page.locator('#tracker .activity-entry')).not.toContainText('Removed');
 await expect(page.locator('#tracker-counts')).toContainText('1Completed activities');
});

test('exports, restores on another device and merges safely; escapes imported content',async({page,browser},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','Download and second-device checks run once');
 await page.goto('./#tracker');const row=seed({notes:'<img src=x onerror=alert(1)>',material:'=SUM(1,2)'});await importBackup(page,[row]);
 await expect(page.locator('.activity-notes')).toHaveText(row.notes);await expect(page.locator('.activity-notes img')).toHaveCount(0);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();
 const download=await downloadPromise;const text=await readFile(await download.path(),'utf8');expect(parseBackup(text)).toHaveLength(1);
 const second=await browser.newContext({baseURL:testInfo.project.use.baseURL||'http://127.0.0.1:4174/spray-net-network-pwa/'}),other=await second.newPage();
 try{await other.goto('./#tracker');await expect(other.locator('.activity-entry')).toHaveCount(0);await importBackup(other,parseBackup(text));await expect(other.locator('.activity-entry')).toContainText('=SUM(1,2)');await importBackup(other,parseBackup(text));await expect(other.locator('#backup-status')).toContainText('Imported 0');
 const newer={...row,updatedAt:'2026-09-02T12:00:00.000Z',outcome:'Newer outcome'};await importBackup(other,[newer]);await importBackup(other,[row]);await expect(other.locator('.activity-entry')).toContainText('Newer outcome');
 const invalid={...row,id:'invalid',occurredOn:'2026-02-30'};await other.locator('#backup-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(backup([newer,invalid]))});await expect(other.locator('#backup-status')).toContainText('valid completed activity date');await expect(other.getByRole('button',{name:'Merge backup'})).toHaveCount(0);await expect(other.locator('.activity-entry')).toHaveCount(1);
 }finally{await second.close()}
 const csvPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export spreadsheet CSV'}).click();const csv=await csvPromise;expect(await readFile(await csv.path(),'utf8')).toContain('"\'=SUM(1,2)"');
});

test('stale edits are rejected and unavailable storage never implies no previous contact',async({page,context},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','Concurrency and failure injection run once');
 await page.goto('./#tracker');await importBackup(page,[seed()]);
 await page.locator('.activity-entry').getByRole('button',{name:'Edit',exact:true}).click();
 const other=await context.newPage();await other.goto('./#tracker');await other.locator('.activity-entry').getByRole('button',{name:'Complete follow-up'}).click();
 await page.locator('form [name=notes]').fill('Stale edit');await page.getByRole('button',{name:'Save changes'}).click();
 await expect(page.locator('.form-message')).toContainText('changed in another tab');
 await other.close();
 const broken=await context.newPage();await broken.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{value:{open(){throw Error('Storage disabled')}}})});await broken.goto('./#directory?outreach=untouched');
 await expect(broken.locator('#result-count')).toHaveText('0 companies');await broken.getByRole('button',{name:'Tracker',exact:true}).click();await expect(broken.locator('#tracker-counts')).toContainText('Tracking unavailable');await expect(broken.getByRole('button',{name:'Export backup',exact:true})).toBeDisabled();await broken.close();
});

test('data validation and outreach dates do not count removed entries or drafts',async({},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','Pure data checks run once');
 expect(()=>validateActivity(seed({type:'draft'}))).toThrow();
 expect(()=>validateActivity(seed({type:'one_pager',delivery:'',material:''}))).toThrow();
 expect(()=>parseBackup(backup([seed(),seed()]))).toThrow();
 const stats=summary([seed(),seed({id:'removed',occurredOn:today(),deletedAt:'2026-09-02T12:00:00Z'})],2,'2026-10-03');
 expect(stats.count).toBe(1);expect(stats.days).toBe(32);
});
