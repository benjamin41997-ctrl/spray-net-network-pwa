import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {newSuggestion,bundle,parseSuggestions,validateConfig,validateRecords} from '../site/suggestions-model.js';
const fixture=()=>newSuggestion({business:'Test Business',city:'Fort Mill',suggestedBy:'Family member',notes:'Owner suggested a conversation.'});
async function add(page,name='Test Business'){
 await page.locator('#suggestion-form [name="business"]').fill(name);
 await page.locator('#suggestion-form [name="city"]').fill('Fort Mill');
 await page.locator('#suggestion-form [name="suggestedBy"]').fill('Family member');
 await page.getByRole('button',{name:'Save suggestion on this device'}).click();
 await expect(page.locator('#suggestion-message')).toContainText('Saved on this device.');
}
test('suggestions validate imports, URLs, stable IDs and completion links',async({},info)=>{
 test.skip(info.project.name!=='desktop','Model checks run once');
 const row=fixture();expect(parseSuggestions(JSON.stringify(bundle([row])))).toEqual([row]);
 for(const bad of [{...row,website:'javascript:alert(1)'},{...row,notes:1},{...row,status:'added'},{...row,id:'bad'},{...row,email:'not-email'},{...row,secret:'extra'},{...row,delivery:'sent'}])expect(()=>validateRecords([bad])).toThrow();
 expect(()=>validateRecords([row,row])).toThrow();expect(()=>newSuggestion({city:'Fort Mill'})).toThrow();
 expect(()=>validateConfig({version:1,endpoint:'https://formspree.io.evil.test/f/abc'})).toThrow();
 expect(parseSuggestions(JSON.stringify({submissions:[{suggestion:JSON.stringify(bundle([row]))}]}))[0].delivery).toBe('accepted');
 const entry={suggestion:JSON.stringify(bundle([row]))};expect(parseSuggestions(JSON.stringify({submissions:[entry,entry]}))).toHaveLength(1);
 expect(()=>parseSuggestions(JSON.stringify({submissions:[entry,{suggestion:JSON.stringify(bundle([{...row,business:'Conflicting business'}]))}]}))).toThrow('Conflicting');
});
test('suggestion handoff, offline persistence, research and repeat import preserve notes',async({page,context,browserName})=>{
 await page.goto('./#suggest');await expect(page.locator('#suggestions h1')).toHaveText('Suggest a contact');
 await expect(page.locator('#suggestions')).toContainText('Sign in through Team sync');
 await page.locator('#suggestion-form [name="business"]').fill('Tailored');await expect(page.locator('#suggestion-matches')).toContainText('Possible existing contacts');
 await add(page,'Test <business>');
 const card=page.locator('[data-suggestion]');await expect(card).toContainText('Test <business>');await expect(card).toContainText('not sent to the team');
 const downloaded=page.waitForEvent('download');await card.getByRole('button',{name:'Download this suggestion'}).click();const bytes=await readFile(await (await downloaded).path());
 await card.locator('summary').click();await card.locator('[name="status"]').selectOption('researching');await card.locator('[name="reviewNotes"]').fill('Confirm official site and office address.');await card.getByRole('button',{name:'Save review'}).click();await expect(page.locator('#suggestion-message')).toContainText('Review saved');
 await page.locator('#suggestions > details > summary').click();await page.locator('#suggestion-import').setInputFiles({name:'contact.json',mimeType:'application/json',buffer:bytes});await page.getByRole('button',{name:'Import suggestions',exact:true}).click();await expect(page.locator('#suggestion-message')).toContainText('Imported 0');
 await expect(card).toContainText('Researching');await expect(page.locator('#connection')).toHaveText('Ready offline');
 if(browserName!=='webkit')await context.setOffline(true);await page.reload();await expect(card).toContainText('Researching');await card.locator('summary').click();await expect(card.locator('[name="reviewNotes"]')).toHaveValue('Confirm official site and office address.');await context.setOffline(false);
 await card.locator('[name="status"]').selectOption('added');await card.getByRole('button',{name:'Save review'}).click();await expect(card.locator('.suggestion-review-message')).toContainText('Select the existing');
 await card.locator('[name="companyId"]').fill('2');await card.getByRole('button',{name:'Save review'}).click();await expect(page.locator('#suggestion-message')).toContainText('No directory entry was published');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Back to directory'}).click();await expect(page.locator('#company-count')).toHaveText('557');
});
test('new browser imports a handoff safely and rejects an invalid batch atomically',async({page})=>{
 await page.goto('./#suggest');await page.locator('#suggestions > details > summary').click();const row=fixture();
 await page.locator('#suggestion-paste').fill(JSON.stringify(bundle([row])));await page.getByRole('button',{name:'Preview pasted suggestions'}).click();await page.getByRole('button',{name:'Import suggestions',exact:true}).click();await expect(page.locator('[data-suggestion]')).toHaveCount(1);
 await page.locator('#suggestion-paste').fill(JSON.stringify({format:'spray-net-contact-suggestions',version:1,records:[fixture(),{...fixture(),notes:123}]}));await page.getByRole('button',{name:'Preview pasted suggestions'}).click();await expect(page.locator('#suggestion-message')).toContainText('Invalid suggestion');await expect(page.locator('[data-suggestion]')).toHaveCount(1);await expect(page.getByRole('button',{name:'Import suggestions',exact:true})).toHaveCount(0);
});
test('delivery requires provider acknowledgment, omits research notes and never retries automatically',async({browser},info)=>{
 test.skip(info.project.name!=='desktop','Transport checks run once');
 const context=await browser.newContext({serviceWorkers:'block',baseURL:'http://127.0.0.1:4174/spray-net-network-pwa/'});
 try{
 await context.route('**/suggestions-config.json',r=>r.fulfill({json:{version:1,endpoint:'https://formspree.io/f/test'}}));let posts=0,payload;
 await context.route('https://formspree.io/f/test',async r=>{posts++;payload=r.request().postDataJSON();await r.fulfill({status:posts===1?429:200,json:posts===1?{error:'Rate limit'}:{ok:true}});});
 const page=await context.newPage();await page.goto('./#suggest');await add(page);const card=page.locator('[data-suggestion]');await card.locator('summary').click();await card.locator('[name="reviewNotes"]').fill('Private internal note');await card.getByRole('button',{name:'Save review'}).click();
 await card.getByRole('button',{name:'Send to team',exact:true}).click();await expect(card).toContainText('Delivery could not be confirmed');expect(posts).toBe(1);expect(payload.suggestion).not.toContain('Private internal note');
 await page.reload();await expect(card).toContainText('Delivery could not be confirmed');expect(posts).toBe(1);page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Retry sending to team'}).click();await expect(card).toContainText('Accepted by the form service');expect(posts).toBe(2);await expect(card.getByRole('button',{name:'Send to team',exact:true})).toHaveCount(0);
 }finally{await context.close();}
});
test('storage failure never claims a saved suggestion and navigation protects drafts',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Failure checks run once');
 await page.goto('./#suggest');await page.locator('#suggestion-form [name="contact"]').fill('Unsaved person');page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Back to directory'}).click();await expect(page.locator('#suggestion-form [name="contact"]')).toHaveValue('Unsaved person');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Back to directory'}).click();
 await page.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){if(name==='spray-net-contact-suggestions')throw Error('Storage unavailable');return open.call(this,name,...args);};});await page.goto('./#suggest');await page.reload();await expect(page.locator('#suggestion-storage')).toContainText('Storage unavailable');await expect(page.getByRole('button',{name:'Save suggestion on this device'})).toBeDisabled();
});
test('review drafts survive filtering and stale tabs cannot overwrite research',async({page,context},info)=>{
 test.skip(info.project.name!=='desktop','Concurrent editing checks run once');
 await page.goto('./#suggest');await add(page);let card=page.locator('[data-suggestion]');await card.locator('summary').click();await card.locator('[name="reviewNotes"]').fill('Unsaved research');
 await page.locator('#suggestion-search').fill('No match');await expect(card).toHaveCount(0);await page.locator('#suggestion-search').fill('');await expect(card.locator('[name="reviewNotes"]')).toHaveValue('Unsaved research');
 const other=await context.newPage();await other.goto('./#suggest');const otherCard=other.locator('[data-suggestion]');await otherCard.locator('summary').click();await otherCard.locator('[name="reviewNotes"]').fill('Newer research from other tab');await otherCard.getByRole('button',{name:'Save review'}).click();await expect(other.locator('#suggestion-message')).toContainText('Review saved');
 await card.getByRole('button',{name:'Save review'}).click();await expect(card.locator('.suggestion-review-message')).toContainText('changed in another tab');await expect(card.locator('[name="reviewNotes"]')).toHaveValue('Unsaved research');await other.close();
});
