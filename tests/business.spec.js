import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {buildNetwork,validateBusinessDetails,isHomeDesigner} from '../site/business-model.js';
const read=async name=>JSON.parse(await readFile(new URL('../site/data/'+name+'.json',import.meta.url),'utf8'));
const directory=await read('directory'),mailing=await read('mailing'),details=await read('business-details');
const network=buildNetwork(directory,mailing,details),businesses=network.companies.filter(c=>c.audiences.includes('business'));
const clinic=businesses.find(c=>c.people.some(p=>p.role?.startsWith('Registry authorized official')));

test('interior and home designers have a dedicated category in both directories',async({page})=>{
 const designers=network.companies.filter(c=>c.directoryCategory==='interior_design');
 expect(designers.length).toBeGreaterThan(0);
 for(const route of ['directory','businesses']){
  await page.goto('./#'+route);
  await page.locator('#category').selectOption('interior_design');
  await expect(page.locator('#result-count')).toHaveText(designers.length.toLocaleString('en-US')+' companies');
  await expect(page.locator('.company-card .category').first()).toHaveText('Interior / home designers');
  await expect(page.locator('#specialty-filter')).toBeVisible();
  const city=designers[0].city;
  await page.locator('#city').selectOption(city);
  await page.reload();
  await expect(page.locator('#category')).toHaveValue('interior_design');
  await expect(page.locator('#city')).toHaveValue(city);
  await expect(page.locator('#result-count')).toHaveText(designers.filter(c=>c.city===city).length.toLocaleString('en-US')+' companies');
 }
});

test('designer classification uses specific services and preserves original records',async({},info)=>{
 test.skip(info.project.name!=='desktop','Pure validation runs once.');
 for(const c of [{subcategory:'Designers',category:'kitchen'},{services:'Kitchen, bath and custom home design'},{subcategory:'Interior Designer'}])expect(isHomeDesigner(c)).toBe(true);
 for(const c of [{name:'Landscape Design Studio',services:'Landscape design'},{name:'House Painting',services:'Interior painting'},{subcategory:'Architects, Cabinets, Carpentry',services:'Residential construction'},{name:'Graphic Design'}])expect(isHomeDesigner(c)).toBe(false);
 for(const c of directory.companies){const published=network.companies.find(n=>n.id===c.id);expect(published.category).toBe(c.category);expect(published.people).toEqual(c.people);}
 expect(network.companies.filter(c=>c.directoryCategory==='interior_design').every(c=>c.audiences.includes('referral')&&c.audiences.includes('business'))).toBe(true);
});

test('business directory exposes profiles, mailing addresses and socials; property managers share their existing identity',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');await page.getByRole('button',{name:'Business directory',exact:true}).click();
 await expect(page).toHaveURL(/#businesses/);
 await expect(page.locator('#company-count')).toHaveText(businesses.length.toLocaleString('en-US'));
 await page.locator('#category').selectOption('retail');
 await page.locator('#search').fill('Waxhaw Jewelers');
 await page.getByRole('link',{name:'Waxhaw Jewelers',exact:true}).click();
 await expect(page.locator('#profile')).toContainText('8145 Kensington Dr');
 await expect(page.getByRole('link',{name:'Email office',exact:true})).toHaveAttribute('href',/info%40waxhawjewelers.com/i);
 await expect(page.getByRole('link',{name:'Social profiles',exact:true})).toHaveAttribute('href',/#social\?company=\d+/);
 await page.reload();await expect(page.getByRole('heading',{name:'Waxhaw Jewelers',exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Back to directory/}).click();
 await expect(page).toHaveURL(/#businesses/);
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 await page.locator('#category').selectOption('property_management');
 await page.locator('#search').fill('Tailored Homes');
 const id=directory.companies.find(c=>c.name==='Tailored Homes Property Management').id;
 await expect(page.getByRole('link',{name:'Tailored Homes Property Management',exact:true})).toHaveAttribute('href','#company/'+id);
 await page.getByRole('button',{name:'Referral network',exact:true}).click();
 await page.locator('#category').selectOption('flooring');
 await expect(page.locator('#cards')).toContainText('Flooring');
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 await page.locator('#specialty').selectOption('countertops');
 await expect(page.locator('.company-card').first()).toBeVisible();
 await expect(page).toHaveURL(/specialty=countertops/);
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('registry contacts remain qualified and can be selected in the existing activity tracker',async({page,context,browserName})=>{
 await page.goto('./#businesses?q='+encodeURIComponent(clinic.name));
 await page.getByRole('link',{name:clinic.name,exact:true}).click();
 await expect(page.locator('#profile')).toContainText('Registry authorized official');
 await expect(page.locator('#profile')).toContainText('exterior approval authority unverified');
 await expect(page.getByRole('link',{name:'Call office',exact:true})).toHaveAttribute('href',/^tel:/);
 await page.locator('#profile .log-details > summary').click();
 const form=page.locator('#profile .activity-form');
 await form.locator('[name=type]').selectOption('call');
 await form.locator('[name=contactId]').selectOption(String(clinic.people[0].id));
 await form.locator('[name=notes]').fill('Test only: attempted office introduction.');
 await form.getByRole('button',{name:'Save activity',exact:true}).click();
 await expect(form.locator('.form-message')).toContainText('Activity saved');
 await page.reload();await expect(page.locator('#profile')).toContainText('Test only: attempted office introduction.');
 if(browserName!=='webkit'){
  await expect(page.locator('#connection')).toHaveText('Ready offline');await context.setOffline(true);
  await page.reload();await expect(page.locator('#profile')).toContainText('Registry authorized official');await context.setOffline(false);
 }
});

test('business details cannot overwrite CRM identities or introduce unsupported contact records',async({},info)=>{
 test.skip(info.project.name!=='desktop','Pure validation runs once.');
 const bad=structuredClone(details);bad.records[0].id=directory.companies[0].id;
 expect(()=>validateBusinessDetails(bad,mailing.recipients)).toThrow();
 const duplicate=structuredClone(details);duplicate.records.push(duplicate.records[0]);expect(()=>validateBusinessDetails(duplicate,mailing.recipients)).toThrow();
 expect(new Set(network.companies.map(c=>c.id)).size).toBe(network.companies.length);
 expect(network.companies.filter(c=>c.category==='property_management').every(c=>c.audiences.includes('referral')&&c.audiences.includes('business'))).toBe(true);
});
