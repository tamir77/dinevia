import {preferredLanguage} from './preferred-language.ts';
import {languages} from './menu.ts';
const supported=(value:string|undefined|null)=>value&&languages.some(([code])=>code===value)?value:'';
export function browserLanguages(header:string){
 return header.split(',').map((entry,i)=>{const [tag,...parts]=entry.trim().split(';');const q=parts.find(p=>p.trim().startsWith('q='));return {tag,q:q?Number(q.trim().slice(2)):1,i}}).filter(x=>x.tag&&Number.isFinite(x.q)&&x.q>0&&x.q<=1).sort((a,b)=>b.q-a.q||a.i-b.i).map(x=>x.tag);
}
export function guestLocale(query:string|undefined|null,saved:string|undefined|null,browser:readonly string[]){return supported(query)||supported(saved)||preferredLanguage(browser)}
