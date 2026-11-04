import type {Layout} from './layout';
export async function pdfEngine(){const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';return pdf;}
export async function readLayout(file:File,language:string):Promise<Layout>{
 const pdf=await pdfEngine(),task=pdf.getDocument({data:await file.arrayBuffer()}),doc=await task.promise;
 try{
 if(doc.numPages>20)throw new Error('PDFs can have up to 20 pages. Please split a larger menu into smaller files.');
 const pages:Layout['pages']=[];
 for(let p=1;p<=doc.numPages;p++){
  const page=await doc.getPage(p),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
  await page.render({canvas,canvasContext:ctx,viewport}).promise;
  const blocks:Layout['pages'][number]['blocks']=[];
  for(const item of content.items){if(!('str' in item)||!item.str.trim())continue;
   const tx=pdf.Util.transform(viewport.transform,item.transform),fontSize=Math.hypot(tx[2],tx[3]),style=content.styles[item.fontName];
   const ascent=style.ascent??(style.descent?1+style.descent:0.8),x=tx[4],y=tx[5]-fontSize*ascent,width=Math.max(item.width,1),height=Math.max(fontSize,1);
   let color='#222222';
   const sx=Math.max(0,Math.floor(x)),sy=Math.max(0,Math.floor(y)),sw=Math.min(canvas.width-sx,Math.ceil(width)),sh=Math.min(canvas.height-sy,Math.ceil(height));
   if(sw>0&&sh>0){const px=ctx.getImageData(sx,sy,sw,sh).data,counts=new Map<string,number>();for(let i=0;i<px.length;i+=4){const rgb=[px[i],px[i+1],px[i+2]].map(v=>Math.round(v/17)*17);const key=rgb.join(',');counts.set(key,(counts.get(key)||0)+1)}const sorted=[...counts].sort((a,b)=>b[1]-a[1]);if(sorted.length){const bg=sorted[0][0].split(',').map(Number);const ink=sorted.find(([key])=>key.split(',').map(Number).reduce((s,v,i)=>s+Math.abs(v-bg[i]),0)>140);if(ink)color='#'+ink[0].split(',').map(n=>Number(n).toString(16).padStart(2,'0')).join('');}}
   blocks.push({id:`p${p}t${blocks.length}`,text:item.str,x,y,width,height,fontSize,fontFamily:style.fontFamily?.includes('sans')?'sans-serif':'serif',color,angle:Math.atan2(tx[1],tx[0])});
  }
  // Combine adjacent fragments on the same line without merging separate columns/prices.
  const merged:typeof blocks=[];
  for(const b of blocks){const a=merged.at(-1),gap=a?b.x-a.x-a.width:100;
   if(a&&Math.abs(a.y-b.y)<1.5&&Math.abs(a.fontSize-b.fontSize)<1&&Math.abs(a.angle)<0.01&&Math.abs(b.angle)<0.01&&gap>=-1&&gap<Math.min(12,b.fontSize)&&/\p{L}/u.test(a.text)&&/\p{L}/u.test(b.text)){a.text+=(gap>1?' ':'')+b.text;a.width=b.x+b.width-a.x;}else merged.push({...b});
  }
  if(merged.length===0)throw new Error(`Page ${p} is a scan without selectable text. Upload a text-based PDF, or use the photo option for an image of the menu.`);
  pages.push({width:viewport.width,height:viewport.height,blocks:merged.sort((a,b)=>Math.abs(a.y-b.y)>3?a.y-b.y:a.x-b.x)});
 }
 return {language,pages};
 }finally{await task.destroy()}
}

// Guest PDFs may contain full-page images or outlined letters instead of text.
export async function readGuestPdf(file:File,language:string,sourceUrl:string|undefined,progress:(done:number,total:number)=>void):Promise<Layout>{
 const pdf=await pdfEngine(),task=pdf.getDocument({data:await file.arrayBuffer()}),doc=await task.promise;
 try{
  if(doc.numPages>20)throw Error('PDFs can have up to 20 pages.');
  const contents=await Promise.all(Array.from({length:doc.numPages},async(_,i)=>(await (await doc.getPage(i+1)).getTextContent()).items));
  if(contents.every(items=>items.some(item=>'str' in item&&item.str.trim()))){return {...await readLayout(file,language),sourceUrl}}
  const {scannedPage}=await import('./scanned-pdf'),{runBatches}=await import('./batch-work');
  const pages:Layout['pages']=new Array(doc.numPages);let done=0;progress(0,doc.numPages);
  await runBatches(Array.from({length:doc.numPages},(_,i)=>i),3,async index=>{
   const page=await doc.getPage(index+1),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:1800/Math.max(base.width,base.height)});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   try{
    await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare PDF page.')),'image/jpeg',.9));
    const form=new FormData();form.set('file',blob,'page.jpg');form.set('width',String(canvas.width));form.set('height',String(canvas.height));
    const response=await fetch('/api/pdf-page',{method:'POST',body:form}),result=await response.json() as {menu?:import('./photo').PhotoMenu|null;error?:string};
    if(!response.ok)throw Error(result.error||'Could not read this PDF page.');
    pages[index]=result.menu?scannedPage(result.menu,index):{width:canvas.width,height:canvas.height,blocks:[]};progress(++done,doc.numPages);
   }finally{canvas.width=0;canvas.height=0;page.cleanup()}
  });
  if(!pages.some(p=>p.blocks.length))throw Error('No readable menu text was found.');
  return {language,pages,sourceUrl};
 }finally{await task.destroy()}
}
