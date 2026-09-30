import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const directoryCompanyCount=String(JSON.parse(await readFile(new URL('../site/data/directory.json',import.meta.url),'utf8')).counts.companies);
import {accountUrl,validateSocial,socialCompanies,progressKey} from '../site/social-model.js';
import {parseSocialBackup,validateProgress} from '../site/social-store.js';
test('social research rejects unsafe links and preserves distinct account identity',async({},info)=>{
 test.skip(info.project.name!=='desktop','Model checks run once');
 for(const url of ['javascript:alert(1)','https://instagram.com.evil.test/brand','https://user:pass@instagram.com/brand','https://www.instagram.com/p/example','https://facebook.com/sharer.php?u=example','https://www.tiktok.com/@brand/video/123','https://youtube.com/watch?v=abc','https://linkedin.com/in/person'])expect(accountUrl(url)).toBeNull();
 expect(accountUrl('https://instagram.com/Brand/?utm_source=web')).toEqual({platform:'instagram',url:'https://www.instagram.com/brand'});
 expect(accountUrl('https://www.facebook.com/people/Company/123456789/')).toEqual({platform:'facebook',url:'https://www.facebook.com/profile.php?id=123456789'});
 const d=JSON.parse(await readFile('site/data/directory.json')),m=JSON.parse(await readFile('site/data/mailing.json')),s=JSON.parse(await readFile('site/data/social.json'));
 expect(()=>validateSocial(s,socialCompanies(d,m))).not.toThrow();const broken=structuredClone(s);broken.reviews[0].companyId=999999999;expect(()=>validateSocial(broken,socialCompanies(d,m))).toThrow();
 const row={profile:'Spray-Net Instagram',url:'https://www.instagram.com/renttailored',status:'followed',updatedAt:new Date().toISOString()};
 expect(parseSocialBackup(JSON.stringify({format:'spray-net-social-progress',version:1,records:[row]}))).toEqual([row]);
 expect(()=>validateProgress([row,row])).toThrow();expect(()=>validateProgress([{...row,url:undefined}])).toThrow();expect(()=>validateProgress([{...row,status:'auto-followed'}])).toThrow();expect(progressKey('SPRAY-NET Instagram',row.url)).toBe(progressKey(row.profile,row.url));
});
test('social queue filters, opens profiles without claiming a follow and offers searches for gaps',async({page,context})=>{
 await page.goto('./#social');await expect(page.locator('#social h1')).toHaveText('Social links');
 await page.locator('#social-priority').check();await page.locator('#social-city').selectOption('Fort Mill');await page.locator('#social-platform').selectOption('instagram');
 await page.locator('#social-search').fill('Tailored');
 const card=page.locator('[data-social-company="2"]');await expect(card).toContainText('Linked by business website');
 const popupPromise=context.waitForEvent('page');await card.getByRole('link',{name:'Open Instagram profile'}).click();const popup=await popupPromise;await popup.close();
 await expect(card.locator('[data-social-url]')).toHaveValue('pending');
 await page.locator('#social-search').fill('');await page.locator('#social-city').selectOption('');await page.locator('#social-platform').selectOption('tiktok');await page.locator('#social-research').selectOption('missing');
 await expect(page.locator('#social-rows')).toContainText('No matching profile recorded');
 const first=page.locator('.social-card').first();await first.locator('summary').click();await expect(first.getByRole('link',{name:'Search TikTok'})).toHaveAttribute('href',/site%3Atiktok.com/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('manual follow progress survives offline reload, stays separate by own profile and restores from backup',async({page,context,browser,browserName})=>{
 await page.goto('./#social?company=2');
 const status=page.locator('[data-social-company="2"] [data-social-url]');
 await page.locator('#social-profile').fill('Spray-Net Instagram');await page.locator('#social-profile').press('Tab');
 await status.selectOption('followed');await expect(page.locator('#social-message')).toContainText('No platform action');
 await expect(page.locator('#connection')).toHaveText('Ready offline');if(browserName!=='webkit')await context.setOffline(true);await page.reload();
 await expect(page.locator('#social-profile')).toHaveValue('Spray-Net Instagram');await expect(status).toHaveValue('followed');await context.setOffline(false);
 await page.locator('#social-profile').fill('Personal account');await page.locator('#social-profile').press('Tab');await expect(status).toHaveValue('pending');
 const promise=page.waitForEvent('download');await page.locator('#social-backup').click();const backup=await promise;const bytes=await readFile(await backup.path());
 const second=await browser.newContext({baseURL:'http://127.0.0.1:4174/spray-net-network-pwa/'});
 try{const other=await second.newPage();await other.goto('./#social?company=2');await other.locator('#social-import').setInputFiles({name:'social.json',mimeType:'application/json',buffer:bytes});await other.getByRole('button',{name:'Merge social backup'}).click();await expect(other.locator('#social-message')).toContainText('imported');await other.locator('#social-profile').fill('Spray-Net Instagram');await other.locator('#social-profile').press('Tab');await expect(other.locator('[data-social-company="2"] [data-social-url]')).toHaveValue('followed');}finally{await second.close()}
});
test('shared brand progress applies across offices and storage failure never implies unfollowed',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Storage and shared-identity checks run once');
 await page.goto('./#social');await page.locator('#social-search').fill('MoveZen');await page.locator('#social-platform').selectOption('instagram');
 await expect(page.locator('[data-social-url]')).toHaveCount(2);await page.locator('[data-social-url]').first().selectOption('followed');await expect(page.locator('[data-social-url]').last()).toHaveValue('followed');
 await page.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){if(name==='spray-net-social-progress')throw Error('Social storage unavailable');return open.call(this,name,...args)}});
 await page.reload();await expect(page.locator('#social-storage')).toContainText('status is unknown');await page.locator('#social-progress').selectOption('pending');await expect(page.locator('[data-social-url]')).toHaveCount(0);
 await page.getByRole('button',{name:'Back to directory'}).click();await expect(page.locator('#company-count')).toHaveText(directoryCompanyCount);
});
