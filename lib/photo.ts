import {z} from 'zod';
export const photoMenuSchema=z.object({
 kind:z.literal('photo'),currency:z.enum(['MDL','RON']).optional(),language:z.string().min(2).max(10),width:z.number().int().positive().max(5000),height:z.number().int().positive().max(5000),
 blocks:z.array(z.object({id:z.string().regex(/^t\d+$/),role:z.enum(['heading','dish','description','price','other']).optional(),text:z.string().min(1).max(3000)})).min(1).max(200),
 warnings:z.array(z.string().max(300)).max(10),
}).refine(d=>d.blocks.reduce((n,b)=>n+b.text.length,0)<=30000,'Too much text in photo');
export type PhotoMenu=z.infer<typeof photoMenuSchema>;
export function imageMime(bytes:Uint8Array){
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
export function numberTokens(texts:string[]){return texts.flatMap(s=>s.match(/\d+(?:[.,]\d+)*/g)||[]).sort()}
