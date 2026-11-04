import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePhotoReading,photoFingerprint} from '../lib/photo-reading.ts';
const reading={language:'ro',texts:['Supă de pui','90 l.','350 gr.'],roles:['dish','price','price'],translations:['Chicken soup','90 MDL','350 g']};
test('one photo response yields validated OCR and translation, preserving original prices and units',()=>{
 const r=parsePhotoReading(reading,800,1200,'en');assert.equal(r.menu.blocks[0].text,'Supă de pui');assert.deepEqual(r.translation.texts,{t0:'Chicken soup',t1:'90 l.',t2:'350 gr.'});
});
test('invalid combined translation keeps recognized text for a text-only retry',()=>{
 const r=parsePhotoReading({...reading,texts:['Chicken 65','90 l.','350 gr.'],translations:['Chicken 66','90 l.','350 gr.']},800,1200,'en');assert.equal(r.translation,undefined);assert.equal(r.menu.blocks[0].text,'Chicken 65');
 assert.equal(parsePhotoReading({...reading,translations:[]},800,1200,'en').translation,undefined);
 assert.throws(()=>parsePhotoReading({...reading,unreadable:true},800,1200,'en'),/could not read/);
 assert.equal(parsePhotoReading(reading,800,1200).translation,undefined);
});
test('scan fingerprints distinguish different image content and dimensions',async()=>{
 const bytes=new Uint8Array([1,2,3]);assert.equal(await photoFingerprint(bytes,800,1200),await photoFingerprint(bytes,800,1200));
 assert.notEqual(await photoFingerprint(bytes,800,1200),await photoFingerprint(new Uint8Array([1,2,4]),800,1200));
 assert.notEqual(await photoFingerprint(bytes,800,1200),await photoFingerprint(bytes,1200,800));
});
