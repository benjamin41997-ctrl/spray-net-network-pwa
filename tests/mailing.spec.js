import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
import {readFile} from 'node:fs/promises';
import {defaultFilters,selectRecipients,csvFor,validateRecipient,mergeMailingCatalog} from '../site/mailing-model.js';
import {validateMailingState,mergeMailingState} from '../site/mailing-store.js';
const published=JSON.parse(await readFile(new URL('../site/data/mailing.json',import.meta.url),'utf8')).recipients.filter(r=>r.status==='published');
const rhDentists=published.filter(r=>r.category==='dentist'&&r.city==='Rock Hill').length;
const fmDentists=published.filter(r=>r.category==='dentist'&&r.city==='Fort Mill').length;
const nextCategories=['medical','med_spa','restaurant','lodging','professional'];
const nextCount=published.filter(r=>nextCategories.includes(r.category)).length;


async function chooseRockHillDentists(page){
  await page.goto('./#mailing');
  await page.getByLabel('Schools',{exact:true}).uncheck();
  await page.getByText('Filter by city',{exact:false}).click();
  await page.getByLabel('Rock Hill',{exact:true}).check();
  await expect(page.locator('#mail-count')).toContainText(`${rhDentists} recipients selected`);
}
async function download(page,label){const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();return await pending;}

test('expanded coverage exposes empty areas, filters approval evidence and keeps CRM identity in Tracker',async({page})=>{
  await page.goto('./#mailing');
  await page.getByText('Territory coverage and research gaps',{exact:true}).click();
  await page.getByLabel('Coverage business type').selectOption('lodging');
  const gap=page.locator('[data-coverage-area="mcadenville"]');
  await expect(gap).toContainText('0 reviewed addresses');await expect(gap).toContainText('Research gap');
  await gap.getByRole('button',{name:'Show this segment'}).click();
  await expect(page.locator('#mail-count')).toContainText('0 recipients selected');
  await page.getByLabel('Territory research area').selectOption('');
  await page.getByLabel('Independent lodging',{exact:true}).uncheck();await page.getByLabel('Wedding / event venues',{exact:true}).check();
  await page.getByLabel('Exterior approval route').selectOption('likely_business');
  await expect(page.locator('#mail-rows')).toContainText('He Will Farms');
  await expect(page.locator('#mail-rows')).toContainText('current authority');
  await expect(page.locator('#mail-rows')).not.toContainText('The Club at Longview');
  await page.getByLabel('List name',{exact:true}).fill('Likely owner venues');await page.getByRole('button',{name:'Save list filters',exact:true}).click();
  await expect(page.locator('#mailing-status')).toContainText('saved');await page.reload();await page.getByLabel('Load a saved list').selectOption('Likely owner venues');
  await expect(page.getByLabel('Exterior approval route')).toHaveValue('likely_business');
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();
  await page.getByLabel('Dentist offices',{exact:true}).uncheck();await page.getByLabel('Schools',{exact:true}).uncheck();await page.getByLabel('Property Management',{exact:true}).check();
  await page.getByLabel('Search businesses').fill('MoveZen Property Management - Rock Hill');
  await expect(page.locator('#mail-count')).toContainText('1 recipients selected');
  await expect(page.locator('#mail-rows [data-recipient="1"]')).toContainText('331 East Main Street');
  await download(page,'Export CSV');await page.locator('.mail-batch > summary').click();
  const form=page.locator('.mail-sent-form');await form.getByLabel('Material / mailer name').fill('Commercial exteriors');await form.getByLabel('My mail service sent this mailing to all 1 listed recipients.').check();
  await form.getByRole('button',{name:'Log this mailing as sent'}).click();await expect(page.locator('#mailing-status')).toContainText('1 sent-mail activities added');
  await page.getByRole('button',{name:'Tracker',exact:true}).click();
  await expect(page.locator('.activity-entry a[href="#company/1"]')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('expanded coverage keeps uncertain registry addresses held and source filters survive backups',async({page})=>{
  await page.goto('./#mailing');await page.getByLabel('Schools',{exact:true}).uncheck();
  await page.getByLabel('Territory research area').selectOption('indian_land');
  await page.getByLabel('Address evidence source').selectOption('healthcare_registry');
  await expect(page.locator('#mail-rows')).toContainText('CMS organization registry');
  await expect(page.locator('#mail-rows')).toContainText('registry record last updated');
  await page.getByLabel('List name',{exact:true}).fill('Indian Land registry');await page.getByRole('button',{name:'Save list filters',exact:true}).click();
  await expect(page.locator('#mailing-status')).toContainText('saved');await download(page,'Export Excel (.xlsx)');
  const backup=await download(page,'Export mailing backup');const {state}=JSON.parse(await readFile(await backup.path(),'utf8'));
  const restored=validateMailingState(state);expect(restored.lists[0].filters.area).toBe('indian_land');expect(restored.lists[0].filters.sourceType).toBe('healthcare_registry');
  for(const r of restored.batches[0].rows){expect(r.status).toBe('published');expect(r.zip.slice(0,5)).toBe('29707');expect(r.addressSourceType).toBe('healthcare_registry');expect(r.exterior.reason).toBeTruthy();}
  await page.getByLabel('Territory research area').selectOption('');
  const heldCatalog=JSON.parse(await readFile(new URL('../site/data/mailing.json',import.meta.url),'utf8')).recipients.filter(r=>r.status==='needs_review'&&r.category==='dentist'&&r.addressSourceType==='healthcare_registry');
  expect(heldCatalog.length).toBeGreaterThan(0);
  for(const r of heldCatalog)await expect(page.locator(`#mail-rows [data-recipient="${r.id}"]`)).toHaveCount(0);
});

test('medical, spa, restaurant, lodging and office prospects retain notes and export postal columns',async({page})=>{
  await page.goto('./#mailing');
  await page.getByLabel('Dentist offices',{exact:true}).uncheck();
  await page.getByLabel('Schools',{exact:true}).uncheck();
  for(const label of ['Medical offices','Med spas','Restaurants / dining locations','Independent lodging','Professional offices'])await page.getByLabel(label,{exact:true}).check();
  await expect(page.locator('#mail-count')).toContainText(`${nextCount} recipients selected`);
  await expect(page.locator('#mail-rows .mail-recipient').filter({hasText:'Long Cove Resort'})).toContainText('members and registered guests');
  await expect(page.locator('#mail-rows .mail-recipient').filter({hasText:'Rock Hill Dermatology Center'})).toContainText('Appointments only');
  await page.getByLabel('List name',{exact:true}).fill('Next exterior prospects');
  await page.getByRole('button',{name:'Save list filters',exact:true}).click();
  await expect(page.locator('#mailing-status')).toContainText('List filters saved');
  await page.reload();await page.getByLabel('Load a saved list').selectOption('Next exterior prospects');
  await expect(page.locator('#mail-count')).toContainText(`${nextCount} recipients selected`);
  const file=await download(page,'Export Excel (.xlsx)');
  const book=new ExcelJS.Workbook();await book.xlsx.readFile(await file.path());
  const sheet=book.getWorksheet('Mailing List'),rows=[];
  sheet.eachRow((row,n)=>{if(n>1)rows.push(row.values.slice(1));});
  expect(sheet.columnCount).toBe(8);expect(rows).toHaveLength(nextCount);
  const catalog=JSON.parse(await readFile(new URL('../site/data/mailing.json',import.meta.url),'utf8'));
  const expected=catalog.recipients.filter(r=>['medical','med_spa','restaurant','lodging','professional'].includes(r.category)&&r.status==='published');
  expect(rows).toEqual(expected.sort((a,b)=>a.name.localeCompare(b.name)).map(r=>[r.name,r.attention,r.address1,r.address2,r.city,r.state,r.zip,r.country]));
  const backup=await download(page,'Export mailing backup');
  const data=JSON.parse(await readFile(await backup.path(),'utf8'));
  const restored=validateMailingState(data.state);
  expect(restored.batches[0].rows.find(r=>r.name==='Long Cove Resort and Marina').prospectNotes).toContain('members and registered guests');
  await page.getByText('Filter by city',{exact:false}).click();await page.getByLabel('Rock Hill',{exact:true}).check();
  await expect(page.locator('#mail-count')).toContainText(`${published.filter(r=>nextCategories.includes(r.category)&&r.city==='Rock Hill').length} recipients selected`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

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
  await page.goto('./#mailing');await expect(page.locator('#mail-count')).toContainText(`${published.filter(r=>['dentist','school'].includes(r.category)).length} recipients selected`);
  await page.getByText('Filter by city',{exact:false}).click();await page.getByLabel('Fort Mill',{exact:true}).check();
  await expect(page.locator('#mail-rows')).toContainText('Fort Mill Dentistry');await expect(page.locator('#mail-rows')).toContainText('Banks Trail Middle School');await expect(page.locator('#mail-rows')).not.toContainText('Cranford Dental');
  await page.getByLabel('Schools',{exact:true}).uncheck();await expect(page.locator('#mail-count')).toContainText(`${fmDentists} recipients selected`);
  await page.locator('#mail-rows .mail-recipient').filter({hasText:'803 Dental'}).getByRole('button',{name:'Do not mail',exact:true}).click();
  await expect(page.locator('#mail-count')).toContainText(`${fmDentists-1} recipients selected`);
  await page.locator('#mail-rows .mail-recipient').filter({hasText:'Fort Mill Dentistry'}).getByRole('button',{name:'Exclude this time',exact:true}).click();
  await page.getByLabel('List name',{exact:true}).fill('Fort Mill dentists');await page.getByRole('button',{name:'Save list filters',exact:true}).click();await expect(page.locator('#mailing-status')).toContainText('List filters saved');
  await page.reload();await page.getByLabel('Load a saved list').selectOption('Fort Mill dentists');await expect(page.locator('#mail-count')).toContainText(`${fmDentists-2} recipients selected`);
  await page.getByLabel('Attention line for this export (optional)').fill('Office Manager');
  const file=await download(page,'Export Excel (.xlsx)');expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
  const book=new ExcelJS.Workbook();await book.xlsx.readFile(await file.path());const sheet=book.getWorksheet('Mailing List');
  expect(sheet.rowCount).toBe(fmDentists-1);expect(sheet.getRow(1).values.slice(1)).toEqual(['Company','Attention','Address 1','Address 2','City','State','ZIP','Country']);
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
  const form=page.locator('.mail-sent-form');await form.getByLabel('Material / mailer name').fill('Fall cabinet postcard');await form.getByLabel(`My mail service sent this mailing to all ${rhDentists} listed recipients.`).check();
  await form.getByRole('button',{name:'Log this mailing as sent'}).click();await expect(page.locator('#mailing-status')).toContainText(`${rhDentists} sent-mail activities added`);
  const retried=await page.evaluate(async()=>{const {readMailingState}=await import('./mailing-store.js'),{logMailingBatch}=await import('./tracker.js'),{today}=await import('./tracker-store.js');return logMailingBatch((await readMailingState()).batches[0],'Fall cabinet postcard',today());});expect(retried).toBe(0);
  await page.getByRole('button',{name:'Tracker',exact:true}).click();await expect(page.locator('#tracker .activity-entry')).toHaveCount(rhDentists);await expect(page.locator('#tracker .activity-history')).toContainText('Cranford Dental');await expect(page.locator('#tracker .activity-history')).toContainText('Fall cabinet postcard');
  await page.getByRole('button',{name:'Mailing Lists',exact:true}).click();await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.getByLabel('Schools',{exact:true}).uncheck();await page.getByText('Filter by city',{exact:false}).click();await page.getByLabel('Rock Hill',{exact:true}).check();await page.getByLabel('Skip recently mailed businesses').selectOption('30');await expect(page.locator('#mail-count')).toContainText('0 recipients selected');
  await page.locator('.mail-batch > summary').click();await expect(page.locator('.mail-batch')).toContainText(`${rhDentists} active activities / ${rhDentists} recorded`);await expect(page.getByRole('button',{name:'Log this mailing as sent'})).toHaveCount(0);
  const again=await download(page,'Download Excel again');const book=new ExcelJS.Workbook();await book.xlsx.readFile(await again.path());expect(book.getWorksheet(1).rowCount).toBe(rhDentists+1);
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
  try{await tab.goto('./#mailing');await tab.locator('#mail-import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:bytes});await tab.getByRole('button',{name:'Merge mailing backup'}).click();await expect(tab.locator('#mail-backup-status')).toContainText('merged');await tab.getByLabel('Load a saved list').selectOption('One office');await expect(tab.locator('#mail-count')).toContainText(`${rhDentists-1} recipients selected`);await expect(tab.locator('.mail-batch')).toHaveCount(1);await tab.getByLabel('ZIP codes',{exact:true}).fill('2973');await expect(tab.locator('#mail-count')).toContainText('five-digit');await expect(tab.getByRole('button',{name:'Export Excel (.xlsx)'})).toBeDisabled();}finally{await other.close();}
});

test('deduplication preserves distinct suites and organizations, validates snapshots and handles leading-zero ZIPs',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','Data integrity runs once');
  const row={id:1000001,name:'Example Dental',category:'dentist',attention:'',address1:'123 Example Street',address2:'Suite 1',city:'Example',state:'MA',zip:'01234',country:'US',source:'https://example.com/address',reviewedOn:'2026-09-21',status:'published'};
  const rows=[row,{...row,id:1000002,address1:'123 Example St.',address2:'STE 1'},{...row,id:1000003,name:'Other business'},{...row,id:1000004,address2:'Suite 2'},{...row,id:1000005,address1:'',status:'needs_review'}];
  let selected=selectRecipients(rows,defaultFilters(),[],()=>null,'2026-09-21');expect(selected.rows).toHaveLength(3);expect(selected.held.map(x=>x.reason)).toEqual(expect.arrayContaining(['Duplicate business/address','Address needs review']));
  selected=selectRecipients(rows,{...defaultFilters(),onePerAddress:true},[],()=>null,'2026-09-21');expect(selected.rows).toHaveLength(2);
  const inlineSuite={...row,id:1000006,address1:'123 Example St. Suite1',address2:''};
  expect(selectRecipients([row,inlineSuite],defaultFilters(),[],()=>null,'2026-09-22').rows).toHaveLength(1);
  selected=selectRecipients(rows,defaultFilters(),[row.id],()=>null,'2026-09-21');expect(selected.rows.map(r=>r.id)).not.toContain(1000002);
  expect(()=>validateRecipient({...row,zip:'123'})).toThrow();expect(csvFor([{...row,name:'=1+1'}])).toContain('"\'=1+1"');
  expect(validateRecipient(row)).toEqual(row); // Existing snapshots without optional notes remain valid.
  expect(()=>validateRecipient({...row,prospectNotes:{text:'Invalid imported note'}})).toThrow();
  expect(()=>validateRecipient({...row,unapprovedField:'value'})).toThrow();
  const crm={id:12,name:'Example Dental',category:'dentist',city:'Example',state:'MA',zip:'01234'};
  expect(mergeMailingCatalog([{...row,id:12}],[crm])).toHaveLength(1);
  expect(()=>mergeMailingCatalog([{...row,id:13}],[crm])).toThrow();
  expect(()=>mergeMailingCatalog([{...row,id:12,name:'Wrong company'}],[crm])).toThrow();
  expect(()=>validateRecipient({...row,exterior:{route:'confirmed_owner',reason:'Unsupported claim',source:row.source,reviewedOn:row.reviewedOn}})).toThrow();
  const legacy=defaultFilters();delete legacy.area;delete legacy.exterior;delete legacy.sourceType;
  expect(selectRecipients([row],legacy,[],()=>null,'2026-09-22').rows).toHaveLength(1);
  const state={version:1,updatedAt:null,lists:[],suppressed:[row.id],batches:[]};expect(mergeMailingState(state,state).suppressed).toEqual([row.id]);expect(()=>validateMailingState({...state,batches:[{id:'x',name:'x',createdAt:'bad',rows:[row]}]})).toThrow();
  await page.goto('./#mailing');
  const buffer=await page.evaluate(async row=>{const {xlsxFor}=await import('./mailing-export.js');return Array.from(new Uint8Array(await xlsxFor([{...row,name:'=1+1'}])));},row);
  const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(buffer));expect(book.getWorksheet(1).getCell('G2').value).toBe('01234');expect(book.getWorksheet(1).getCell('A2').value).toBe('=1+1');expect(book.getWorksheet(1).getCell('A2').type).toBe(ExcelJS.ValueType.String);
});
