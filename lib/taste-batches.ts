import {isMenuAmount} from './menu-amount.ts';
export type TasteBlock={id:string;text:string;role?:string};
// Split at complete dish boundaries, never between a dish and its ingredients.
// Unstructured menus keep the single-call path rather than guessing boundaries.
export function tasteBatches(blocks:TasteBlock[],size=22):TasteBlock[][]{
 const starts=blocks.flatMap((b,i)=>b.role==='dish'?[i]:[]);
 if(starts.length<2)return [blocks];
 const batches:TasteBlock[][]=[];let current:TasteBlock[]=[];
 for(let n=0;n<starts.length;n++){
  if(n%size===0){if(current.length)batches.push(current);current=[];}
  const category=blocks.slice(0,starts[n]).findLast(b=>b.role==='heading');
  if(category&&!current.some(b=>b.id===category.id))current.push(category);
  current.push(...blocks.slice(starts[n],starts[n+1]??blocks.length).filter(b=>!isMenuAmount(b.text)));
 }
 if(current.length)batches.push(current);
 return batches;
}
export async function recommendationKey(menuId:string,version:number,language:string,rules:string,blocks:TasteBlock[],preferences:unknown){
 const bytes=new TextEncoder().encode(JSON.stringify([menuId,version,language,rules,blocks,preferences]));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
export function createPendingCache<T>(){
 const pending=new Map<string,Promise<T>>();
 return (key:string,load:()=>Promise<T>)=>{
  const existing=pending.get(key);if(existing)return existing;
  const task=Promise.resolve().then(load).finally(()=>pending.delete(key));pending.set(key,task);return task;
 }
}
