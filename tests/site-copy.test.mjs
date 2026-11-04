import test from 'node:test';
import assert from 'node:assert/strict';
import {languages} from '../lib/menu.ts';
import {siteCopy} from '../lib/site-copy.ts';
import copies from '../lib/site-locales.json' with {type:'json'};
import {readFile} from 'node:fs/promises';
test('all seven site languages contain complete headline, restaurant and FAQ copy',()=>{
 assert.deepEqual(Object.keys(copies).sort(),languages.map(([code])=>code).sort());
 for(const [code] of languages){const c=siteCopy(code);assert.deepEqual(Object.keys(c).sort(),Object.keys(copies.en).sort());assert.equal(c.headline.length,4);assert.equal(c.faq.length,6);assert.equal(c.hostSteps.length,3);for(const s of [c.headline,...c.faq,...c.hostSteps])for(const value of s)assert(value.trim().length>0);if(code!=='en'){assert.notEqual(c.faqTitle,copies.en.faqTitle);assert.notEqual(c.hostPreviewBody,copies.en.hostPreviewBody);assert.notEqual(c.headline[0],copies.en.headline[0]);}}
});
test('restaurant overview is informational and has no account or upload workflow',async()=>{
 const source=await readFile(new URL('../app/restaurants/view.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/<form|type="password"|account\/|MenuImport|api\(/);
 assert.match(source,/t.hostPreviewBody/);assert.match(source,/FAQ language=/);
});
