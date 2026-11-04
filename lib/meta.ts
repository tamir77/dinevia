import {env} from 'cloudflare:workers';
import {translateDocument} from './translation-engine';
import type {MenuDocument} from './menu-document';
export function isConfigured(){return Boolean((env as unknown as Record<string,string>).MODEL_API_KEY?.trim());}
export async function translateLayout(layout:MenuDocument,language:string,options:{concurrency?:number;readable?:boolean}={}){
 const key=(env as unknown as Record<string,string>).MODEL_API_KEY?.trim();if(!key)throw new Error('Translation is not connected yet.');
 return translateDocument(layout,language,key,options);
}
