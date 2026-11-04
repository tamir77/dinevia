import {z} from 'zod';
import {layoutSchema, type Layout} from './layout';
import {photoMenuSchema,type PhotoMenu} from './photo';

export const webMenuSchema=z.object({
 kind:z.literal('html'),language:z.string().min(2).max(10),
 sourceUrl:z.string().url().max(2000).refine(value=>{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password}),
 blocks:z.array(z.object({id:z.string().regex(/^t\d+$/),role:z.enum(['heading','dish','description','price','other']).optional(),text:z.string().min(1).max(4000)})).min(1).max(3000),
 warnings:z.array(z.string().max(300)).max(10),
}).refine(d=>d.blocks.reduce((n,b)=>n+b.text.length,0)<=100000,'Maximum 100000 characters');
export const menuDocumentSchema=z.union([webMenuSchema,photoMenuSchema,layoutSchema]);
export type WebMenu=z.infer<typeof webMenuSchema>;
export type MenuDocument=Layout|WebMenu|PhotoMenu;
export function isWebMenu(data:MenuDocument):data is WebMenu{return 'kind' in data&&data.kind==='html'}
export function isPhotoMenu(data:MenuDocument):data is PhotoMenu{return 'kind' in data&&data.kind==='photo'}
export function documentSections(data:MenuDocument):{blocks:{id:string;text:string}[]}[]{return isWebMenu(data)||isPhotoMenu(data)?[{blocks:data.blocks}]:data.pages}
export function documentBlocks(data:MenuDocument){return documentSections(data).flatMap(section=>section.blocks)}
