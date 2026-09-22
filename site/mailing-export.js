import {exportHeaders,exportRow} from './mailing-model.js';
let excelReady;
function loadExcel(){return excelReady??=new Promise((resolve,reject)=>{if(window.ExcelJS){resolve(window.ExcelJS);return;}const script=document.createElement('script');script.src='./vendor/exceljs.min.js';script.onload=()=>resolve(window.ExcelJS);script.onerror=()=>{excelReady=null;script.remove();reject(Error('Excel export could not load. Reconnect and update the app, or use CSV.'));};document.head.append(script);});}
export async function xlsxFor(rows){
  const Excel=await loadExcel(),book=new Excel.Workbook();book.creator='Spray-Net Partner Network';
  const sheet=book.addWorksheet('Mailing List',{views:[{state:'frozen',ySplit:1}]});
  sheet.columns=exportHeaders.map((header,i)=>({header,key:String(i),width:[48,28,38,20,22,10,14,12][i]}));
  for(const r of rows)sheet.addRow(exportRow(r));
  sheet.eachRow((row,index)=>{row.height=index===1?26:32;row.eachCell({includeEmpty:true},cell=>{cell.numFmt='@';cell.alignment={vertical:'middle',wrapText:true};cell.font={name:'Calibri',size:11,...(index===1?{bold:true,color:{argb:'FFFFFFFF'}}:{color:{argb:'FF17344A'}})};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:index===1?'FF003965':index%2?'FFF0F5F8':'FFFFFFFF'}};});});
  sheet.autoFilter={from:'A1',to:`H${rows.length+1}`};
  return book.xlsx.writeBuffer();
}
export function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
