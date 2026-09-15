import {test,expect} from '@playwright/test';
test('search, priority filters, contacts and profile links work under a repository path',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
 await expect(page.locator('#company-count')).toHaveText('554');
 await page.getByRole('button',{name:'Priority 30',exact:true}).click();
 await expect(page.locator('#result-count')).toHaveText('30 companies');
 await page.getByLabel('Search the network').fill('Whitney');
 await expect(page.locator('#result-count')).toHaveText('1 company');
 await page.getByRole('link',{name:'Tailored Homes Property Management',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Whitney Whitesides',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'wwhitesides@renttailored.com'}).first()).toHaveAttribute('href',/^mailto:/);
 await expect(page.locator('#profile')).toContainText('Before outreach');
 await page.reload();await expect(page.getByRole('heading',{name:'Tailored Homes Property Management',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to directory'}).click();
 await page.getByRole('button',{name:'Clear filters'}).click();
 await page.getByLabel('Search the network').fill('no-such-company-xyz');await expect(page.getByRole('heading',{name:'No matches yet.'})).toBeVisible();
 expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('category, email and pagination filter correctly',async({page})=>{
 await page.goto('./');await expect(page.locator('#company-count')).toHaveText('554');
 await page.locator('#category').selectOption('kitchen');await page.locator('#contact').selectOption('email');
 const names=await page.locator('.company-card h2').allTextContents();expect(names.length).toBeGreaterThan(0);
 await expect(page.locator('.company-card .category').first()).toHaveText('Cabinet / Kitchen Industry');
 await page.getByRole('button',{name:'Clear filters'}).click();await page.getByRole('button',{name:'Next →',exact:true}).click();
 await expect(page.locator('#pagination')).toContainText('Page 2');await expect(page).toHaveURL(/page=2/);
 await page.getByRole('button',{name:'About',exact:true}).click();await expect(page.getByRole('heading',{name:'Install & use offline'})).toBeVisible();
});
test('installation manifest and entire snapshot remain available offline',async({page,context,browserName})=>{
 await page.goto('./');await expect(page.locator('#connection')).toHaveText('Ready offline');
 await page.reload();
 const manifest=await page.evaluate(async()=>{const r=await fetch('manifest.webmanifest');return r.json()});
 expect(manifest.display).toBe('standalone');expect(manifest.start_url).toBe('./');expect(manifest.icons.some(i=>i.purpose==='maskable')).toBe(true);
 // WebKit emulation does not reliably reproduce service-worker offline routing.
 if(browserName==='webkit')return;
 await context.setOffline(true);await page.reload();await expect(page.locator('#company-count')).toHaveText('554');
 await page.getByLabel('Search the network').fill('Dawson');await page.getByRole('link',{name:'Dawson Property Management',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Derek Dawson',exact:true})).toBeVisible();
 await expect(page.locator('#connection')).toContainText('Offline');
 await context.setOffline(false);
});
