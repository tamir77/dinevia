import type {Layout} from './layout';
import type {PhotoMenu} from './photo';
// OCR coordinates are for the guest text view only; the original PDF is retained.
export function scannedPage(page:PhotoMenu,index:number):Layout['pages'][number]{return {width:page.width,height:page.height,blocks:page.blocks.map((b,i)=>({...b,id:`p${index+1}t${i}`,x:0,y:i*24,width:page.width,height:20,fontSize:16,fontFamily:'sans-serif',color:'#222222',angle:0}))}}
