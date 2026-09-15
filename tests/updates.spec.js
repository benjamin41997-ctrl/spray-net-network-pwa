import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
test('an existing installed client can activate a new published snapshot',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','Exercise release replacement once, serially.');
 const swPath=new URL('../dist/sw.js',import.meta.url),dataPath=new URL('../dist/data/directory.json',import.meta.url);
 const originalSw=await readFile(swPath,'utf8'),originalData=await readFile(dataPath,'utf8');
 try{
  await page.goto('./');await expect(page.locator('#connection')).toHaveText('Ready offline');await page.reload();
  const next=JSON.parse(originalData);next.companies[0].name='Updated published company';
  await writeFile(dataPath,JSON.stringify(next));await writeFile(swPath,originalSw.replace(/spray-net-network-([a-f0-9]+)/g,'spray-net-network-test-update'));
  await page.getByRole('button',{name:'About',exact:true}).click();await page.getByRole('button',{name:'Check for updates',exact:true}).click();
  await expect(page.getByRole('button',{name:'Update now',exact:true})).toBeVisible();await page.getByRole('button',{name:'Update now',exact:true}).click();
  await expect(page.locator('#connection')).toHaveText('Ready offline');await page.getByRole('button',{name:'Back to directory'}).click();
  await page.getByLabel('Search the network').fill('Updated published company');await expect(page.locator('#result-count')).toHaveText('1 company');
 }finally{await writeFile(swPath,originalSw);await writeFile(dataPath,originalData);}
});
