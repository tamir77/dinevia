import {photoMenuSchema,type PhotoMenu} from './photo.ts';
import {isMenuAmount} from './menu-amount.ts';
import type {Translated} from './layout';

export function parsePhotoReading(d:any,width:number,height:number,language?:string):{menu:PhotoMenu;translation?:Translated}{
 if(d.unreadable||!Array.isArray(d.texts)||!d.texts.length||d.texts.length>200||d.texts.some((t:unknown)=>typeof t!=='string'||!t.trim()||t.length>3000))throw new Error('We could not read the entire menu clearly. Take a closer photo, straight on and without glare.');
 const menu=photoMenuSchema.parse({kind:'photo',language:typeof d.language==='string'&&/^[a-z]{2}$/.test(d.language)?d.language:'auto',width,height,blocks:d.texts.map((text:string,i:number)=>({id:`t${i}`,text,...(['heading','dish','description','price','other'].includes(d.roles?.[i])?{role:d.roles[i]}:{})})),warnings:['AI recreates the translated photo. Fonts and small details may differ. Compare with the original.']});
 if(!language||!Array.isArray(d.translations)||d.translations.length!==menu.blocks.length)return {menu};
 const texts:Record<string,string>={};
 for(const [i,b] of menu.blocks.entries()){
  const t=isMenuAmount(b.text)?b.text:d.translations[i],numbers=(s:string)=>s.match(/\d+(?:[.,]\d+)*/g)?.join('|')||'';
  // An invalid first translation falls back to text translation, never another scan.
  if(typeof t!=='string'||!t.trim()||t.length>5000||numbers(t)!==numbers(b.text))return {menu};
  texts[b.id]=t;
 }
 return {menu,translation:{language,texts}};
}

export async function photoFingerprint(bytes:Uint8Array,width:number,height:number){
 const digest=await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>);
 return `v2:${width}:${height}:`+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
