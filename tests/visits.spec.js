import {test,expect} from '@playwright/test';
import {validateVisit,unknownVisit} from '../site/visits.js';

test('Fort Mill quick stops exclude appointment offices and retain filters on return',async({page})=>{
 await page.goto('./');
 await page.getByRole('combobox',{name:'City',exact:true}).selectOption('Fort Mill');
 await page.getByRole('button',{name:'Priority 30',exact:true}).click();
 await page.getByRole('button',{name:'Drop-in stops',exact:true}).click();
 await expect(page.locator('#result-count')).toHaveText('1 company');
 await expect(page.locator('#cards')).toContainText('Baxter Cabinets');
 await expect(page.locator('#cards')).not.toContainText('Tailored Homes');
 await expect(page.locator('#cards')).not.toContainText('R&L Stone');
 await expect(page.locator('#cards')).toContainText('Saturday by appointment');
 await page.reload();
 await expect(page.locator('#visit')).toHaveValue('walk_in');
 await page.getByRole('link',{name:'Baxter Cabinets - Fort Mill Showroom',exact:true}).click();
 await expect(page.locator('.visit-panel')).toContainText('1504 Carolina Place Drive');
 await expect(page.getByRole('link',{name:'Directions to visitor address'})).toHaveAttribute('href',/destination=1504/);
 await page.getByRole('button',{name:'Back to directory'}).click();
 await expect(page.locator('#city')).toHaveValue('Fort Mill');
 await expect(page.locator('#result-count')).toHaveText('1 company');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#city').selectOption('Rock Hill');
 await expect(page.locator('.empty')).toContainText('No reviewed drop-in stops');
});

test('visit warnings, unknowns and offline filters remain available',async({page,context,browserName})=>{
 await page.goto('./#directory?city=Fort+Mill&visit=appointment_only');
 await expect(page.locator('#cards')).toContainText('Tailored Homes');
 await expect(page.locator('#cards')).toContainText('R&L Stone');
 await expect(page.locator('#cards')).not.toContainText('Baxter Cabinets');
 await page.getByRole('link',{name:'Tailored Homes Property Management',exact:true}).click();
 await expect(page.locator('.visit-panel')).toContainText('Appointment only');
 await expect(page.locator('.visit-panel')).toContainText('Schedule a meeting');
 await expect(page.getByRole('link',{name:'Directions to visitor address'})).toHaveCount(0);
 await page.getByRole('button',{name:'Back to directory'}).click();
 await page.locator('#visit').selectOption('unknown');
 await expect(page.locator('.visit-badge').first()).toHaveText('Visit unverified · call first');
 await expect(page.locator('#connection')).toHaveText('Ready offline');
 if(browserName==='webkit')return;
 await page.reload();await context.setOffline(true);await page.reload();
 await page.locator('#visit').selectOption('walk_in');
 await expect(page.locator('#cards')).toContainText('Baxter Cabinets');
 await context.setOffline(false);
});

test('publication rejects unsupported walk-ins and residential directions',async({},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','Pure data checks only run once');
 expect(()=>validateVisit(unknownVisit)).not.toThrow();
 expect(()=>validateVisit({...unknownVisit,status:'walk_in'})).toThrow();
 expect(()=>validateVisit({...unknownVisit,status:'home_based',address:'123 Private Lane'})).toThrow();
 expect(()=>validateVisit({...unknownVisit,privateNotes:'Do not publish'})).toThrow();
 expect(()=>validateVisit({...unknownVisit,status:'appointment_only'})).toThrow();
});
