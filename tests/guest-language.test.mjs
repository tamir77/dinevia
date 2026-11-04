import test from 'node:test';
import assert from 'node:assert/strict';
import {languages} from '../lib/menu.ts';
import {guestCopy,languageName} from '../lib/guest-copy.ts';
import {importCopy} from '../lib/import-copy.ts';
import {homeCopy} from '../lib/home-copy.ts';
import {tasteCopy} from '../lib/taste-copy.ts';
function sameShape(base,value){assert.deepEqual(Object.keys(value).sort(),Object.keys(base).sort());for(const [key,v] of Object.entries(base)){if(typeof v==='string')assert.equal(typeof value[key],'string');else sameShape(v,value[key])}}
test('every selectable language has complete prepared guest, import and taste UI translations',()=>{
 for(const [code] of languages){
  sameShape(homeCopy('en'),homeCopy(code));
  if(code!=='en')assert.notEqual(homeCopy(code).intro,homeCopy('en').intro,code);
  sameShape(guestCopy('en'),guestCopy(code));sameShape(importCopy('en'),importCopy(code));sameShape(tasteCopy('en'),tasteCopy(code));
  if(code!=='en'){assert.notEqual(guestCopy(code).intro,guestCopy('en').intro,code);assert.notEqual(importCopy(code).intro,importCopy('en').intro,code);assert.notEqual(tasteCopy(code).noConflict,tasteCopy('en').noConflict,code)}
  assert(languageName(code,code));
 }
});
test('Hebrew guest controls and currency labels contain Hebrew rather than English fallbacks',()=>{
 for(const value of Object.values(guestCopy('he')))assert.match(value,/[\u0590-\u05ff]/);
 for(const value of Object.values(importCopy('he')))assert.match(value,/[\u0590-\u05ff]/);
 assert.equal(languageName('en','he'),'אנגלית');
});

test('language controls render identical labels without browser Intl locale data',()=>{
 const before=languages.flatMap(([locale])=>languages.map(([code])=>languageName(code,locale)));
 const original=Intl.DisplayNames;
 try{Intl.DisplayNames=class {constructor(){throw Error('Different Safari locale data')}};
  assert.deepEqual(languages.flatMap(([locale])=>languages.map(([code])=>languageName(code,locale))),before);
  assert.equal(languageName('it','en-US'),'Italian');
 }finally{Intl.DisplayNames=original}
});
