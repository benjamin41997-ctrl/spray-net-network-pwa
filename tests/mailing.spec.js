import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
import {readFile} from 'node:fs/promises';
import {defaultFilters,selectRecipients,csvFor,validateRecipient} from '../site/mailing-model.js';
import {validateMailingState,mergeMailingState} from '../site/mailing-store.js';

async function chooseRockHillDentists(page){
  await page.goto('./#mailing');
  await page.getByLabel('Schools',{exact:true}).uncheck();
  await page.getByText('Filter by city',{exact:false}).click();
  await page.getByLabel('Rock Hill',{exact:true}).check();
  await expect(page.locator('#mail-count')).toContainText('2 recipients selected');
}
async function download(page,label){const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();return await pending;}

test('new exterior prospect categories combine, persist and export their exact mailing addresses',async({page})=>{
  await page.goto('./#mailing');
  await page.getByLabel('Dentist offices',{exact:true}).uncheck();
  await page.getByLabel('Schools',{exact:true}).uncheck();
  for(const label of ['Veterinary clinics','Funeral homes','Private childcare / preschools','Churches / religious facilities','Wedding / event venues']){
    await page.getByLabel(label,{exact:true}).check();
  }
  await expect(page.locator('#mail-count')).toContainText('35 recipients selected');
  await page.getByLabel('List name',{exact:true}).fill('Exterior prospects');
  await page.getByRole('button',{name:'Save list filters',exact:true}).click();
  await expect(page.locator('#mailing-status')).toContainText('List filters saved');
  await page.reload();
  await page.getByLabel('Load a saved list').selectOption('Exterior prospects');
  await expect(page.locator('#mail-count')).toContainText('35 recipients selected');
  const file=await download(page,'Export Excel (.xlsx)');
  const book=new ExcelJS.Workbook();await book.xlsx.readFile(await file.path());
  const sheet=book.getWorksheet('Mailing List'),rows=[];
  sheet.eachRow((row,n)=>{if(n>1)rows.push(row.values.slice(1));});
  const catalog=JSON.parse(await readFile(new URL('../site/data/mailing.json',import.meta.url),'utf8'));
  const expected=catalog.recipients.filter(r=>['veterinary','funeral','childcare','church','venue'].includes(r.category));
  expect(rows).toHaveLength(expected.length);
  expect(rows.map(r=>r[0]).sort()).toEqual(expected.map(r=>r.name).sort());
  expect(rows.find(r=>r[0]==='Unity Presbyterian Church').slice(2,7)).toEqual(['PO Box 1267','','Fort Mill','SC','29716-1267']);
  expect(rows.find(r=>r[0]==='Waxhaw Animal Hospital')[2]).toBe('PO Box 275');
  expect(rows.find(r=>r[0]==='Carolina Place Animal Hospital - Fort Mill')[3]).toBe('Suite 101');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('combines categories and locations, saves exclusions and exports real Excel with text ZIPs',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./#mailing');await expect(page.locator('#mail-count')).toContainText('60 recipients selected');
  await page.getByText('Filter by city',{exact:false}).click();await page.getByLabel('Fort Mill',{exact:true}).check();
  await expect(page.locator('#mail-rows')).toContainText('Fort Mill Dentistry');await expect(page.locator('#mail-rows')).toContainText('Banks Trail Middle School');await expect(page.locator('#mail-rows')).not.toContainText('Cranford Dental');
  await page.getByLabel('Schools',{exact:true}).uncheck();await expect(page.locator('#mail-count')).toContainText('6 recipients selected');
  await page.locator('#mail-rows .mail-recipient').filter({hasText:'803 Dental'}).getByRole('button',{name:'Do not mail',exact:true}).click();
  await expect(page.locator('#mail-count')).toContainText('5 recipients selected');
  await page.locator('#mail-rows .mail-recipient').filter({hasText:'Fort Mill Dentistry'}).getByRole('button',{name:'Exclude this time',exact:true}).click();
  await page.getByLabel('List name',{exact:true}).fill('Fort Mill dentists');await page.getByRole('button',{name:'Save list filters',exact:true}).click();await expect(page.locator('#mailing-status')).toContainText('List filters saved');
  await page.reload();await page.getByLabel('Load a saved list').selectOption('Fort Mill dentists');await expect(page.locator('#mail-count')).toContainText('4 recipients selected');
  await page.getByLabel('Attention line for this export (optional)').fill('Office Manager');
  const file=await download(page,'Export Excel (.xlsx)');expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
  const book=new ExcelJS.Workbook();await book.xlsx.readFile(await file.path());const sheet=book.getWorksheet('Mailing List');
  expect(sheet.rowCount).toBe(5);expect(sheet.getRow(1).values.slice(1)).toEqual(['Company','Attention','Address 1','Address 2','City','State','ZIP','Country']);
  expect(sheet.getCell('B2').value).toBe('Office Manager');expect(typeof sheet.getCell('G2').value).toBe('string');expect(sheet.getCell('G2').numFmt).toBe('@');expect(sheet.views[0].ySplit).toBe(1);
  for(let n=2;n<=sheet.rowCount;n++){expect(sheet.getCell('E'+n).value).toBe('Fort Mill');expect(sheet.getCell('A'+n).value).not.toBe('803 Dental');}
  await expect(page.locator('#mail-batches')).toContainText('not logged as sent');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Tracker',exact:true}).click();await expect(page.locator('#tracker-counts')).toContainText('0Completed activities');expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('logs only explicitly sent exported recipients and filters recent mail, offline',async({page,context,browserName})=>{
  await chooseRockHillDentists(page);await page.getByLabel('List name',{exact:true}).fill('Rock Hill dental fall mailing');
  const file=await download(page,'Export CSV');expect(await readFile(await file.path(),'utf8')).toContain('Cranford Dental');
  await expect(page.locator('#connection')).toHaveText('Ready offline');
  if(browserName!=='webkit')await context.setOffline(true);
  await page.reload();await expect(page.locator('.mail-batch')).toHaveCount(1);await page.locator('.mail-batch > summary').click();
  // A changed current filter must not change the exported batch being logged.
  await page.getByLabel('Search businesses').fill('Fort Mill Dentistry');
  const form=page.locator('.mail-sent-form');await form.getByLabel('Material / mailer name').fill('Fall cabinet postcard');await form.getByLabel('My mail service sent this mailing to all 2 listed recipients.').check();
  await form.getByRole('button',{name:'Log this mailing as sent'}).click();await expect(page.locator('#mailing-status')).toContainText('2 sent-mail activities added');
  const retried=await page.evaluate(async()=>{const {readMailingState}=await import('./mailing-store.js'),{logMailingBatch}=await import('./tracker.js'),{today}=await import('./tracker-store.js');return logMailingBatch((await readMailingState()).batches[0],'Fall cabinet postcard',today());});expect(retried).toBe(0);
  await page.getByRole('button',{name:'Tracker',exact:true}).click();await expect(page.locator('#tracker .activity-entry')).toHaveCount(2);await expect(page.locator('#tracker .activity-history')).toContainText('Cranford Dental');await expect(page.locator('#tracker .activity-history')).toContainText('Fall cabinet postcard');
  await page.getByRole('button',{name:'Mailing Lists',exact:true}).click();await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.getByLabel('Schools',{exact:true}).uncheck();await page.getByText('Filter by city',{exact:false}).click();await page.getByLabel('Rock Hill',{exact:true}).check();await page.getByLabel('Skip recently mailed businesses').selectOption('30');await expect(page.locator('#mail-count')).toContainText('0 recipients selected');
  await page.locator('.mail-batch > summary').click();await expect(page.locator('.mail-batch')).toContainText('2 active activities / 2 recorded');await expect(page.getByRole('button',{name:'Log this mailing as sent'})).toHaveCount(0);
  const again=await download(page,'Download Excel again');const book=new ExcelJS.Workbook();await book.xlsx.readFile(await again.path());expect(book.getWorksheet(1).rowCount).toBe(3);
  await context.setOffline(false);
});

test('unavailable mailing storage blocks exports without breaking the directory',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','Storage failure runs once');
  await page.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){if(name==='spray-net-mailing-lists')throw Error('Mailing storage disabled');return open.call(this,name,...args);};});
  await page.goto('./#mailing');await expect(page.getByRole('alert')).toContainText('Mailing storage disabled');await expect(page.getByRole('button',{name:'Export Excel (.xlsx)'})).toBeDisabled();
  await page.getByRole('button',{name:'Back to directory'}).click();await expect(page.locator('#company-count')).toHaveText('557');
});

test('mailing backups retain exclusions and exported lists; bad ZIP filters cannot silently export',async({page,browser},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','Backup transfer runs once');
  await chooseRockHillDentists(page);await page.locator('#mail-rows .mail-recipient').filter({hasText:'Cranford Dental'}).getByRole('button',{name:'Do not mail',exact:true}).click();
  await page.getByLabel('List name',{exact:true}).fill('One office');await page.getByRole('button',{name:'Save list filters'}).click();await expect(page.locator('#mailing-status')).toContainText('saved');await download(page,'Export CSV');
  const backup=await download(page,'Export mailing backup'),bytes=await readFile(await backup.path());
  const other=await browser.newContext({baseURL:'http://127.0.0.1:4174/spray-net-network-pwa/'}),tab=await other.newPage();
  try{await tab.goto('./#mailing');await tab.locator('#mail-import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:bytes});await tab.getByRole('button',{name:'Merge mailing backup'}).click();await expect(tab.locator('#mail-backup-status')).toContainText('merged');await tab.getByLabel('Load a saved list').selectOption('One office');await expect(tab.locator('#mail-count')).toContainText('1 recipients selected');await expect(tab.locator('.mail-batch')).toHaveCount(1);await tab.getByLabel('ZIP codes',{exact:true}).fill('2973');await expect(tab.locator('#mail-count')).toContainText('five-digit');await expect(tab.getByRole('button',{name:'Export Excel (.xlsx)'})).toBeDisabled();}finally{await other.close();}
});

test('deduplication preserves distinct suites and organizations, validates snapshots and handles leading-zero ZIPs',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','Data integrity runs once');
  const row={id:1000001,name:'Example Dental',category:'dentist',attention:'',address1:'123 Example Street',address2:'Suite 1',city:'Example',state:'MA',zip:'01234',country:'US',source:'https://example.com/address',reviewedOn:'2026-09-21',status:'published'};
  const rows=[row,{...row,id:1000002,address1:'123 Example St.',address2:'STE 1'},{...row,id:1000003,name:'Other business'},{...row,id:1000004,address2:'Suite 2'},{...row,id:1000005,address1:'',status:'needs_review'}];
  let selected=selectRecipients(rows,defaultFilters(),[],()=>null,'2026-09-21');expect(selected.rows).toHaveLength(3);expect(selected.held.map(x=>x.reason)).toEqual(expect.arrayContaining(['Duplicate business/address','Address needs review']));
  selected=selectRecipients(rows,{...defaultFilters(),onePerAddress:true},[],()=>null,'2026-09-21');expect(selected.rows).toHaveLength(2);
  selected=selectRecipients(rows,defaultFilters(),[row.id],()=>null,'2026-09-21');expect(selected.rows.map(r=>r.id)).not.toContain(1000002);
  expect(()=>validateRecipient({...row,zip:'123'})).toThrow();expect(csvFor([{...row,name:'=1+1'}])).toContain('"\'=1+1"');
  const state={version:1,updatedAt:null,lists:[],suppressed:[row.id],batches:[]};expect(mergeMailingState(state,state).suppressed).toEqual([row.id]);expect(()=>validateMailingState({...state,batches:[{id:'x',name:'x',createdAt:'bad',rows:[row]}]})).toThrow();
  await page.goto('./#mailing');
  const buffer=await page.evaluate(async row=>{const {xlsxFor}=await import('./mailing-export.js');return Array.from(new Uint8Array(await xlsxFor([{...row,name:'=1+1'}])));},row);
  const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(buffer));expect(book.getWorksheet(1).getCell('G2').value).toBe('01234');expect(book.getWorksheet(1).getCell('A2').value).toBe('=1+1');expect(book.getWorksheet(1).getCell('A2').type).toBe(ExcelJS.ValueType.String);
});
