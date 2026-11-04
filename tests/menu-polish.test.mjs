import test from 'node:test';import assert from 'node:assert/strict';
import {snapshotHtml} from '../scripts/vite/html-menu-snapshot.ts';
import {readableHtml} from '../lib/readable-html.ts';
import {tasteBatches,recommendationKey,createPendingCache} from '../lib/taste-batches.ts';
import {guestLocale,browserLanguages} from '../lib/guest-locale.ts';
const html='<div id="header"><div class="h_menu_mob_wr"><a>Wine of Moldova</a><a>Login</a><a>Bar</a><div class="lang">Ro Ru En</div><div class="dev">mun. Chișinău, str. Puskin 30, MD-2038</div></div></div><div id="main"><div class="col"><div class="title5">Seasonal menu</div><ul class="b_info6"><li><div class="descr"><div class="title6">Salmon with rice</div><div class="price">240 MDL</div></div></li></ul><div class="title5">Dessert</div><ul class="b_info6"><li><div class="title6">Chişinău de seară</div><div class="price">150 MDL</div></li></ul></div></div><div id="footer"><p>30 Puskin str., MD-2038, Moldova, Republic of</p></div>';
test('Fuior-style div markup yields only categories, dishes and prices, in new and old menus',async()=>{
 const source={url:'https://fuior.md/en/menu',type:'text/html',bytes:Buffer.from(html)},load=async()=>{throw Error('No assets')};
 const fresh=await snapshotHtml(source,'en',load,{textOnly:true}),old=await snapshotHtml(source,'en',load);
 const cleaned=readableHtml(old.data,old.html);
 for(const data of [fresh.data,cleaned]){
  assert.deepEqual(data.blocks.map(b=>b.text),['Seasonal menu','Salmon with rice','240 MDL','Dessert','Chişinău de seară','150 MDL']);
  assert.deepEqual(data.blocks.map(b=>b.role),['heading','dish','price','heading','dish','price']);
 }
 for(const b of cleaned.blocks)assert.equal(old.data.blocks.find(x=>x.id===b.id).text,b.text);
});
test('browser locale respects ranked languages, explicit choice and unsupported fallback',()=>{
 assert.equal(guestLocale(null,null,['he-IL','en-US']),'en');assert.equal(guestLocale(null,null,['fr-FR']),'fr');
 assert.equal(guestLocale(null,null,['xx-ZZ','ja-JP']),'ja');assert.equal(guestLocale(null,null,['xx-ZZ']),'en');
 assert.equal(guestLocale('de','en',['he']),'de');assert.equal(guestLocale(null,'he',['en']),'en');
 assert.deepEqual(browserLanguages('en;q=0.3,he-IL;q=1,fr;q=0,de;q=no'),['he-IL','en']);
});
test('recommendation batches retain every complete dish and its category while skipping standalone quantities',()=>{
 const blocks=[{id:'category',text:'Main courses',role:'heading'},...Array.from({length:61},(_,i)=>[{id:'n'+i,text:'Dish '+i,role:'dish'},{id:'d'+i,text:'Chicken and potatoes',role:'description'},{id:'p'+i,text:'120 MDL',role:'price'}]).flat()];
 const batches=tasteBatches(blocks);assert.deepEqual(batches.map(b=>b.filter(x=>x.role==='dish').length),[22,22,17]);
 for(let i=0;i<61;i++){const b=batches.find(b=>b.some(x=>x.id==='n'+i));assert(b.some(x=>x.id==='d'+i));assert(b.some(x=>x.id==='category'));assert(!b.some(x=>x.id==='p'+i))}
 const unstructured=blocks.map(({id,text})=>({id,text}));assert.equal(tasteBatches(unstructured).length,1);
});
test('saved taste key isolates changed source, menu revision, language, preferences and rules',async()=>{
 const args=['m',1,'he','v1',[{id:'a',text:'Salmon'}],{never:['fish']}],base=await recommendationKey(...args);
 for(const [i,value] of [[0,'other'],[1,2],[2,'en'],[3,'v2'],[4,[{id:'a',text:'Chicken'}]],[5,{never:['onions']}]]){const next=[...args];next[i]=value;assert.notEqual(await recommendationKey(...next),base)}
});
test('identical in-flight recommendations share work and failures remain retryable',async()=>{
 const run=createPendingCache();let calls=0;const load=async()=>{calls++;await new Promise(r=>setTimeout(r,10));return 'ok'};
 assert.deepEqual(await Promise.all([run('a',load),run('a',load)]),['ok','ok']);assert.equal(calls,1);
 await assert.rejects(run('a',async()=>{throw Error('failed')}));assert.equal(await run('a',load),'ok');assert.equal(calls,2);
});
