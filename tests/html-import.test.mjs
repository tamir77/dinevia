import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from 'parse5';
import {snapshotHtml,snapshotCsp} from '../scripts/vite/html-menu-snapshot.ts';
const source=html=>({url:'https://restaurant.example/menu',type:'text/html',bytes:Buffer.from(html)});
function nodes(html){const out=[];function walk(n){out.push(n);for(const c of n.childNodes||[])walk(c)}walk(parse(html));return out}

test('retains page structure, text markers and prices; removes active content and navigation',async()=>{
 const r=await snapshotHtml(source(`<html><head><script>evil()</script><meta http-equiv="refresh" content="0;url=https://evil.example"><base href="https://restaurant.example/"></head><body onload="evil()"><main class="menu"><a href="#soups">Supe</a><h2 id="soups">Supe</h2><p>Supă <strong>de pui</strong> 90 MDL</p><form action="https://evil.example"><button onclick="evil()">Order</button></form><iframe src="http://localhost/"></iframe><object data="https://evil.example"></object><a href="javascript:evil()">Unsafe link</a><!--mp-text:t999--><p hidden>Hidden text</p></main></body></html>`),'ro',async()=>{throw Error('unexpected network')});
 const all=nodes(r.html),elements=all.filter(n=>n.tagName);
 assert(!elements.some(n=>['script','iframe','object','base'].includes(n.tagName)));
 assert(!elements.some(n=>n.attrs.some(a=>a.name.startsWith('on')||['href','action','srcdoc'].includes(a.name))));
 assert(elements.some(n=>n.tagName==='strong'));
 assert(elements.some(n=>n.attrs.some(a=>a.name==='data-mp-anchor'&&a.value==='soups')));
 assert.deepEqual(r.data.blocks.map(b=>b.text),['Supe','Supe','Supă','de pui','90 MDL','Order','Unsafe link']);
 assert.equal(all.filter(n=>n.nodeName==='#comment').length,r.data.blocks.length);
 assert(r.html.includes(snapshotCsp));
});

test('embeds CSS, nested styles, fonts and duplicate images without browser network dependencies',async()=>{
 const calls=[];
 const resources={
  'https://restaurant.example/style.css':['text/css','@import "./colors.css" screen; @font-face{font-family:Menu;src:url(./font.woff2)} .menu{display:grid;background:url(./photo.jpg)}'],
  'https://restaurant.example/colors.css':['text/css','.menu{color:green}'],
  'https://restaurant.example/font.woff2':['font/woff2','fake-font'],
  'https://restaurant.example/photo.jpg':['image/jpeg','fake-photo'],
 };
 const r=await snapshotHtml(source('<link rel="stylesheet" href="/style.css"><main class="menu"><h1>Meniu</h1><img src="/photo.jpg"><img src="/photo.jpg"><p>Salată 120 MDL</p></main>'),'ro',async url=>{calls.push(url);const [type,body]=resources[url]||[];if(!type)throw Error(url);return {url,type,bytes:Buffer.from(body)}});
 assert.equal(calls.length,4);assert.equal(r.data.warnings.length,0);
 assert(r.html.includes('display:grid'));assert(r.html.includes('@media screen'));assert(r.html.includes('data:font/woff2;base64,'));
 const imgs=nodes(r.html).filter(n=>n.tagName==='img');assert.equal(imgs.length,2);assert(imgs.every(n=>n.attrs.find(a=>a.name==='src').value.startsWith('data:image/jpeg;base64,')));
});

test('fails clearly for JavaScript-only menus and reports missing visual resources',async()=>{
 await assert.rejects(snapshotHtml(source('<div id="app"></div><script>renderMenu()</script>'),'ro',async()=>{throw Error()}),/No menu text/);
 const r=await snapshotHtml(source('<h1>Menu</h1><img src="http://127.0.0.1/private">'),'en',async()=>{throw Error('blocked')});
 assert.equal(r.data.warnings.length,1);assert(r.html.includes('src="data:,"'));
});


test('guest text import retains menu text and prices without fetching design assets',async()=>{
 let calls=0;
 const r=await snapshotHtml(source('<link rel="stylesheet" href="/style.css"><style>p{background:url(/bg.jpg)}</style><nav>Order online</nav><main style="background:url(/wall.jpg)"><h2>Breakfast</h2><h3>Eggs</h3><img src="/eggs.jpg"><p style="background:url(/detail.jpg)">Eggs with tomatoes · 95 LEI · 250/100 g</p></main>'),'en',async()=>{calls++;throw Error('no asset fetch expected')},{textOnly:true});
 assert.equal(calls,0);
 assert.deepEqual(r.data.blocks.map(b=>b.text),['Breakfast','Eggs','Eggs with tomatoes · 95 LEI · 250/100 g']);
 assert.equal(r.data.blocks[0].role,'heading');
 assert.equal(r.data.blocks[1].role,'dish');
 assert.equal(r.data.warnings.length,0);
 assert(!nodes(r.html).some(n=>n.tagName==='img'));
});
