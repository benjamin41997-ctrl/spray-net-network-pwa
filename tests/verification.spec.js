import {test,expect} from '@playwright/test';
import {summary} from '../site/tracker-store.js';
test('verification reports persist without marking a business contacted',async({page})=>{
 await page.goto('./#verification');
 await expect(page.getByRole('heading',{name:'Verify records',exact:true})).toBeVisible();
 await expect(page.locator('#verification')).toContainText('complete current business mailing address');
 await page.locator('#verification-form [name=company]').selectOption('2');
 await page.locator('#verification-form [name=kind]').selectOption('returned_mail');
 await page.locator('#verification-form [name=evidence]').fill('Envelope returned today; confirm suite before resending.');
 await page.getByRole('button',{name:'Save finding',exact:true}).click();
 await expect(page.locator('#verification-message')).toContainText('Finding saved');
 await page.reload();
 await expect(page.locator('#verification')).toContainText('Envelope returned today');
 await page.goto('./#company/2');
 await expect(page.locator('#profile .touch-summary')).toContainText('No activity logged');
});
test('directory reports are not outreach',()=>{
 expect(summary([{companyId:2,material:'Directory verification',deletedAt:null}],2).count).toBe(0);
});
