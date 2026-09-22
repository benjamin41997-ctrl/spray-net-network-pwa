import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
test('an existing installed client can activate a new published snapshot',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','Exercise release replacement once, serially.');
 const swPath=new URL('../dist/sw.js',import.meta.url),dataPath=new URL('../dist/data/directory.json',import.meta.url),mailingPath=new URL('../dist/data/mailing.json',import.meta.url);
 const originalSw=await readFile(swPath,'utf8'),originalData=await readFile(dataPath,'utf8'),originalMailing=await readFile(mailingPath,'utf8');
 try{
  await page.goto('./');await expect(page.locator('#connection')).toHaveText('Ready offline');await page.reload();
  await page.getByRole('button',{name:'Tracker',exact:true}).click();
  await page.locator('#tracker .log-details > summary').click();
  await page.locator('#tracker [name=companyId]').selectOption('2');
  await page.locator('#tracker [name=notes]').fill('Keep this private activity through the app update.');
  await page.getByRole('button',{name:'Save activity',exact:true}).click();
  await expect(page.locator('#tracker .form-message')).toContainText('Activity saved');
  await page.getByRole('button',{name:'Mailing Lists',exact:true}).click();
  await page.getByLabel('List name',{exact:true}).fill('Keep mailing filters through update');
  await page.getByRole('button',{name:'Save list filters',exact:true}).click();
  await expect(page.locator('#mailing-status')).toContainText('List filters saved');
  const next=JSON.parse(originalData);next.companies[0].name='Updated published company';
  const nextMailing=JSON.parse(originalMailing);const mailingCompany=nextMailing.recipients.find(r=>r.id===next.companies[0].id);if(mailingCompany)mailingCompany.name=next.companies[0].name;await writeFile(mailingPath,JSON.stringify(nextMailing));
  await writeFile(dataPath,JSON.stringify(next));await writeFile(swPath,originalSw.replace(/spray-net-network-([a-f0-9]+)/g,'spray-net-network-test-update'));
  await page.getByRole('button',{name:'About',exact:true}).click();await page.getByRole('button',{name:'Check for updates',exact:true}).click();
  await expect(page.getByRole('button',{name:'Update now',exact:true})).toBeVisible();await page.getByRole('button',{name:'Update now',exact:true}).click();
  await expect(page.locator('#connection')).toHaveText('Ready offline');await page.getByRole('button',{name:'Back to directory'}).click();
  await page.getByLabel('Search the network').fill('Updated published company');await expect(page.locator('#result-count')).toHaveText('1 company');
  await page.getByRole('button',{name:'Tracker',exact:true}).click();
  await expect(page.locator('#tracker .activity-entry')).toContainText('Keep this private activity through the app update.');
  await page.getByRole('button',{name:'Mailing Lists',exact:true}).click();
  await page.getByLabel('Load a saved list').selectOption('Keep mailing filters through update');
  await expect(page.getByLabel('List name',{exact:true})).toHaveValue('Keep mailing filters through update');
 }finally{await writeFile(swPath,originalSw);await writeFile(dataPath,originalData);await writeFile(mailingPath,originalMailing);}
});
