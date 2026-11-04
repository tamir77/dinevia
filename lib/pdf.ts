import type {Layout} from './layout';
export async function pdfEngine(){const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';return pdf;}
export async function readLayout(file:File,language:string):Promise<Layout>{
 const pdf=await pdfEngine(),task=pdf.getDocument({data:await file.arrayBuffer()}),doc=await task.promise;
 try{
 if(doc.numPages>20)throw new Error('В первой версии поддерживаются PDF до 20 страниц. Разделите меню на части.');
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
  if(merged.length<2)throw new Error(`Страница ${p} — скан или изображение без текстового слоя. Для точного сохранения оформления сейчас нужен текстовый PDF. Этот файл требует отдельного OCR-режима.`);
  pages.push({width:viewport.width,height:viewport.height,blocks:merged.sort((a,b)=>Math.abs(a.y-b.y)>3?a.y-b.y:a.x-b.x)});
 }
 return {language,pages};
 }finally{await task.destroy()}
}
