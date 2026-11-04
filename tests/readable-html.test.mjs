import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotHtml} from '../scripts/vite/html-menu-snapshot.ts';
import {readableHtml} from '../lib/readable-html.ts';
import {isMenuAmount} from '../lib/menu-amount.ts';
import {runBatches} from '../lib/batch-work.ts';

const source={url:'https://restaurant.example/menu',type:'text/html',bytes:Buffer.from(`<html><body><a class="skip-link" href="#main">Skip to content</a><header>Home</header><main id="main"><h1>Menu</h1><ul><li><a href="#raw"><span>Raw bar</span></a></li></ul><h2 id="raw">Raw bar</h2><div><h5><span>Tuna tataki</span></h5><p>Yuzu sauce<br>170 gr.</p></div><h6>270 l.</h6><h5>Steak</h5><p>100 gr.</p><h6>1,000 l.</h6><p style="display:none">Hidden SEO words</p><p aria-hidden="true">Hidden copy</p></main><footer>Opening hours</footer><div>Book a table</div></body></html>`)};
test('extracts dishes from page-builder HTML, excluding navigation, popups and hidden SEO',async()=>{
 const r=await snapshotHtml(source,'en',async()=>{throw Error('unexpected asset')},{textOnly:true});
 assert.deepEqual(r.data.blocks.map(b=>b.text),['Menu','Raw bar','Tuna tataki','Yuzu sauce','170 gr.','270 l.','Steak','100 gr.','1,000 l.']);
 assert.equal(r.data.blocks.find(b=>b.text==='Tuna tataki').role,'dish');
 for(const text of ['170 gr.','270 l.','1,000 l.'])assert.equal(r.data.blocks.find(b=>b.text===text).role,'price');
});
test('repairs older saved snapshots without changing IDs or their cached translations',async()=>{
 const saved=await snapshotHtml(source,'en',async()=>{throw Error('unexpected asset')});
 const legacy={...saved.data,blocks:saved.data.blocks.map(({id,text})=>({id,text}))};
 const cleaned=readableHtml(legacy,saved.html);
 assert(cleaned.blocks.length<legacy.blocks.length);
 for(const b of cleaned.blocks)assert.equal(legacy.blocks.find(old=>old.id===b.id).text,b.text);
 assert.equal(cleaned.blocks.find(b=>b.text==='Tuna tataki').role,'dish');
 assert(!cleaned.blocks.some(b=>b.text==='Book a table'));
});
test('local price and quantity abbreviations stay intact without mistaking dish names for prices',()=>{
 for(const x of ['270 l.','170 gr.','250/100 g','1,000 MDL','95 LEI','€ 20.50','20%'])assert(isMenuAmount(x),x);
 for(const x of ['Chicken 65','2 eggs with ham','Available until 17:00'])assert(!isMenuAmount(x),x);
});
test('bounded translation workers process all batches without exceeding the limit',async()=>{
 let active=0,peak=0;const done=[];
 await runBatches([1,2,3,4,5,6,7],3,async n=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,5));done.push(n);active--});
 assert.equal(peak,3);assert.equal(active,0);assert.deepEqual(done.sort(),[1,2,3,4,5,6,7]);
});
test('a failed translation stops queued batches and waits for in-flight work',async()=>{
 const started=[],done=[];
 await assert.rejects(runBatches([1,2,3,4,5],2,async n=>{started.push(n);if(n===1)throw Error('translation failed');await new Promise(r=>setTimeout(r,5));done.push(n)}),/translation failed/);
 assert.deepEqual(started,[1,2]);assert.deepEqual(done,[2]);
});
test('removes contact, booking and promotional chrome inside main before translation, keeping culinary notes',async()=>{
 const html='<main><div class="restaurant-contact"><h2>Find us</h2><p>17 Main Street</p><p>+373 222 12345</p></div><section class="our-story"><h2>Our story</h2><p>A wonderful place since 1990</p></section><div class="cookie-consent">Accept all cookies</div><h2>Soups</h2><h3>Mushroom soup</h3><p>Cream, mushrooms, onion</p><p>300 g</p><p>120 Lei</p><p>Contains milk. Service charge 10%.</p><p>Ask about seasonal dishes.</p><a>Book a table</a><p>info@example.com</p><div class="newsletter">Subscribe to our newsletter</div></main>';
 const result=await snapshotHtml({url:source.url,type:'text/html',bytes:Buffer.from(html)},'en',async()=>{throw Error('No assets')},{textOnly:true});
 assert.deepEqual(result.data.blocks.map(b=>b.text),['Soups','Mushroom soup','Cream, mushrooms, onion','300 g','120 Lei','Contains milk. Service charge 10%.','Ask about seasonal dishes.']);
 const old=await snapshotHtml({url:source.url,type:'text/html',bytes:Buffer.from(html)},'en',async()=>{throw Error('No assets')});
 assert.deepEqual(readableHtml(old.data,old.html).blocks.map(b=>b.text),result.data.blocks.map(b=>b.text));
});
test('a page containing only excluded chrome cannot fall back to translating that chrome',async()=>{
 const r=await snapshotHtml({url:source.url,type:'text/html',bytes:Buffer.from('<main><div class="contact"><h2>Find us</h2><p>15 Main Street</p></div></main>')},'en',async()=>{throw Error('No assets')});
 assert.equal(readableHtml(r.data,r.html).blocks.length,0);
});
