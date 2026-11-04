// Adapter for the public image menu used by laplacinte.md. No site scripts run.
export type ImageMenuCatalog={kind:'image-menu';sourceUrl:string;restaurant:string;groups:{name:string;pages:{url:string}[]}[]};
type Resource={url:string;type:string;bytes:Buffer};
export type PublicRequest={method?:'GET'|'POST';headers?:Record<string,string>;body?:string};
type Loader=(url:string,options?:PublicRequest)=>Promise<Resource>;
export function isLaPlacinteMenu(raw:string){const u=new URL(raw);return ['laplacinte.md','www.laplacinte.md'].includes(u.hostname)&&/^\/restaurantmenu\/?$/.test(u.pathname)}
export function publicAppIdentifiers(script:string){
 const refs=script.match(/apikey:(\w+),apipassword:(\w+)/);
 const literal=(name:string)=>script.match(new RegExp('(?:const |,|;)'+name+'="([A-Za-z0-9_-]{1,128})"'))?.[1];
 const apikey=refs&&literal(refs[1]),apipassword=refs&&literal(refs[2]);
 if(!apikey||!apipassword)throw Error('The restaurant changed its menu viewer. Open the original page and upload a menu photo instead.');
 // These are public website bootstrap identifiers, not a user or restaurant login.
 return {apikey,apipassword};
}
export function parseImageCatalog(value:unknown,sourceUrl:string):ImageMenuCatalog{
 const payload=value as {status?:boolean;data?:{name?:unknown;data?:{image?:unknown}[]}[]};
 if(payload.status!==true||!Array.isArray(payload.data)||payload.data.length>20)throw Error('The restaurant menu is temporarily unavailable. Please try again later.');
 let total=0;const groups=payload.data.filter(g=>Array.isArray(g.data)&&g.data.length).map(g=>{
  if(typeof g.name!=='string'||!g.name.trim()||g.name.length>120||g.data!.length>80)throw Error('The restaurant returned an unsupported menu.');
  const pages=g.data!.map(p=>{if(typeof p.image!=='string'||p.image.length>2000)throw Error('The restaurant returned an invalid menu image.');const url=new URL(p.image);if(url.protocol!=='https:'||url.hostname!=='back.laplacinte.md'||url.port||url.username||url.password||!url.pathname.startsWith('/image/'))throw Error('The restaurant returned an unexpected image address.');return {url:url.href}});
  total+=pages.length;return {name:g.name,pages};
 });
 if(!groups.length||total>160)throw Error('No supported menu pages were found.');
 return {kind:'image-menu',sourceUrl,restaurant:'La Plăcinte',groups};
}
const cache=new Map<string,{until:number;catalog:ImageMenuCatalog}>();
export async function loadLaPlacinteMenu(source:Resource,load:Loader){
 if(!isLaPlacinteMenu(source.url))throw Error('Unsupported restaurant menu viewer.');
 const previous=cache.get(source.url);if(previous&&previous.until>Date.now())return previous.catalog;
 const path=source.bytes.toString('utf8').match(/<script\b[^>]*\bsrc=["'](\/assets\/index-[\w-]+\.js)["']/)?.[1];
 if(!path)throw Error('The restaurant changed its menu viewer. Please try a photo of the menu.');
 const bundle=await load(new URL(path,source.url).href),identifiers=publicAppIdentifiers(bundle.bytes.toString('utf8'));
 // Start the same anonymous, read-only menu session as the public website.
 // Tokens stay in memory and are sent only to this restaurant's fixed API origin.
 const start=await load('https://back.laplacinte.md/api/appstart',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...identifiers,language:'en-gb'})});
 const session=JSON.parse(start.bytes.toString('utf8'));
 if(session.status!==true||typeof session.s_token!=='string'||session.s_token.length>2048)throw Error('Could not open the restaurant’s public menu. Please try again later.');
 const response=await load('https://back.laplacinte.md/api/getofflinemenu',{headers:{stoken:session.s_token,Accept:'image/webp'}});
 const catalog=parseImageCatalog(JSON.parse(response.bytes.toString('utf8')),source.url);
 cache.set(source.url,{until:Date.now()+300000,catalog});return catalog;
}
