'use client';
import {useEffect,useRef,useState} from 'react';
import {pdfEngine} from '../lib/pdf';
import type {Layout,Translated} from '../lib/layout';
function Page({doc,index,layout,translation}:{doc:any;index:number;layout:Layout;translation:Translated|null}){
 const canvas=useRef<HTMLCanvasElement>(null),[warning,setWarning]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let stopped=false,task:any;setError('');setWarning('');(async()=>{
  const engine=await pdfEngine(),page=await doc.getPage(index+1);if(stopped)return;
  const scale=1.6,viewport=page.getViewport({scale}),out=document.createElement('canvas');out.width=Math.ceil(viewport.width);out.height=Math.ceil(viewport.height);const ctx=out.getContext('2d')!;
  const ops=translation?await page.getOperatorList():null;if(stopped)return;
  const textOps=new Set([engine.OPS.showText,engine.OPS.showSpacedText,engine.OPS.nextLineShowText,engine.OPS.nextLineSetSpacingShowText]);
  task=page.render({canvas:out,canvasContext:ctx,viewport,...(ops?{operationsFilter:(i:number)=>!textOps.has(ops.fnArray[i])}:{})});await task.promise;if(stopped)return;
  let small=0;
  if(translation)for(const b of layout.pages[index].blocks){
   const text=translation.texts[b.id]??b.text;ctx.save();ctx.translate(b.x*scale,b.y*scale);ctx.rotate(b.angle);ctx.scale(scale,scale);ctx.fillStyle=b.color;ctx.textBaseline='top';
   const rtl=/[\u0590-\u08FF]/.test(text);ctx.direction=rtl?'rtl':'ltr';ctx.textAlign=rtl?'right':'left';
   let size=b.fontSize;ctx.font=`${size}px ${b.fontFamily}`;let ratio=Math.min(1,b.width/Math.max(ctx.measureText(text).width,1));size*=ratio;if(size<8&&text!==b.text)small++;
   ctx.font=`${size}px ${b.fontFamily}`;ctx.fillText(text,rtl?b.width:0,Math.max(0,(b.height-size)*0.15));ctx.restore();
  }
  if(stopped)return;const target=canvas.current!;target.width=out.width;target.height=out.height;target.getContext('2d')!.drawImage(out,0,0);if(small)setWarning('Some text is smaller to fit the original design. Zoom in or switch to text view.');
 })().catch(e=>{if(!stopped&&e.name!=='RenderingCancelledException')setError('Could not display the PDF. '+e.message)});
 return()=>{stopped=true;task?.cancel()};},[doc,index,layout,translation]);
 return <div className="pdfpage"><canvas ref={canvas} role="img" aria-label={`Menu page ${index+1}${translation?' translated':''}`}/>{warning&&<p className="layoutwarning">{warning}</p>}{error&&<p role="alert">{error}</p>}<span className="pagenumber">{index+1} / {layout.pages.length}</span></div>
}
export default function DocumentViewer({src,layout,translation}:{src:string;layout:Layout;translation:Translated|null}){
 const [doc,setDoc]=useState<any>(null),[error,setError]=useState('');
 useEffect(()=>{let stopped=false,task:any;setDoc(null);setError('');(async()=>{const pdf=await pdfEngine();if(stopped)return;task=pdf.getDocument({url:src});const d=await task.promise;if(!stopped)setDoc(d)})().catch(e=>{if(!stopped)setError(e.message)});return()=>{stopped=true;task?.destroy()};},[src]);
 if(error)return <p role="alert">Could not open the PDF: {error}</p>;
 if(!doc)return <div className="loadingdoc">Opening PDF pages…</div>;
 return <div className="pdfpages">{layout.pages.map((_,i)=><Page key={i} doc={doc} index={i} layout={layout} translation={translation}/>)}</div>
}
