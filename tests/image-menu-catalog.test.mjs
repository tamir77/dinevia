import test from 'node:test';
import assert from 'node:assert/strict';
import {isLaPlacinteMenu,parseImageCatalog,publicAppIdentifiers,loadLaPlacinteMenu} from '../scripts/vite/image-menu-catalog.ts';
const image='https://back.laplacinte.md/image/catalog/menu.webp';
test('recognizes the exact restaurant menu route, validates image origins and page counts',()=>{
 assert(isLaPlacinteMenu('https://laplacinte.md/restaurantmenu?lang=en'));
 assert(!isLaPlacinteMenu('https://laplacinte.md.evil.test/restaurantmenu'));
 assert(!isLaPlacinteMenu('https://laplacinte.md/checkout'));
 const value={status:true,data:[{name:'Main menu',data:[{image}]}]};
 assert.equal(parseImageCatalog(value,'https://laplacinte.md/restaurantmenu').groups[0].pages[0].url,image);
 for(const invalid of ['http://127.0.0.1/menu.png','https://evil.test/menu.webp','https://back.laplacinte.md/api/account','https://user:password@back.laplacinte.md/image/a.webp'])assert.throws(()=>parseImageCatalog({status:true,data:[{name:'Menu',data:[{image:invalid}]}]},'https://laplacinte.md/restaurantmenu'));
 assert.throws(()=>parseImageCatalog({status:true,data:[{name:'Menu',data:Array(81).fill({image})}]},'https://laplacinte.md/restaurantmenu'));
});
test('loads public menu data without running scripts or exposing anonymous session tokens',async()=>{
 const js='const app="public-example",pwd="public-example";JSON.stringify({apikey:app,apipassword:pwd,language:e})';
 assert.deepEqual(publicAppIdentifiers(js),{apikey:'public-example',apipassword:'public-example'});
 assert.throws(()=>publicAppIdentifiers('eval("something")'));
 const calls=[],source={url:'https://laplacinte.md/restaurantmenu?test=adapter',type:'text/html',bytes:Buffer.from('<script type="module" src="/assets/index-test.js"></script>')};
 const result=await loadLaPlacinteMenu(source,async(url,options)=>{calls.push({url,options});const text=url.endsWith('.js')?js:url.endsWith('/appstart')?JSON.stringify({status:true,s_token:'synthetic-session'}):JSON.stringify({status:true,data:[{name:'Main menu',data:[{image}]}]});return {url,type:'application/json',bytes:Buffer.from(text)}});
 assert.equal(calls[1].url,'https://back.laplacinte.md/api/appstart');assert.equal(calls[1].options.method,'POST');assert.equal(calls[2].options.headers.stoken,'synthetic-session');assert(!JSON.stringify(result).includes('synthetic-session'));assert.equal(result.kind,'image-menu');
});
