import test from 'node:test';
import assert from 'node:assert/strict';
import {scannedPage} from '../lib/scanned-pdf.ts';
import {layoutSchema} from '../lib/layout.ts';
const photo={kind:'photo',language:'ro',width:1200,height:1800,warnings:[],blocks:[{id:'t0',role:'heading',text:'Supe'},{id:'t1',role:'dish',text:'Supă de pui'},{id:'t2',role:'price',text:'120 Lei'}]};
test('scanned PDF preserves prices, category roles and unique page identifiers',()=>{
 const pages=[scannedPage(photo,0),scannedPage(photo,1)],layout=layoutSchema.parse({language:'auto',sourceUrl:'https://gogiya.md/base_menu.pdf',pages});
 assert.equal(new Set(pages.flatMap(p=>p.blocks.map(b=>b.id))).size,6);
 assert.equal(layout.pages[1].blocks[0].role,'heading');assert.equal(layout.pages[1].blocks[2].text,'120 Lei');
 assert.equal(layout.sourceUrl,'https://gogiya.md/base_menu.pdf');
});
test('empty cover pages retain their position without fabricated menu items',()=>{
 const page=scannedPage({...photo,blocks:[]},0);assert.deepEqual(page.blocks,[]);
 assert(layoutSchema.safeParse({language:'auto',pages:[page,scannedPage(photo,1)]}).success);
});
