import test from 'node:test';
import assert from 'node:assert/strict';
import {translationGroups,wrongTranslationLanguage,translateDocument,translationRevision} from '../lib/translation-engine.ts';
const document={kind:'photo',language:'ro',blocks:[{id:'a',role:'heading',text:'양고기'},{id:'b',role:'heading',text:'LAMB | Miel | Ягнёнок'},{id:'c',role:'dish',text:'Lamb Bulgogi 8,11'},{id:'d',role:'description',text:'Felii subțiri de miel marinate în stil coreean'},{id:'e',role:'description',text:'Thinly sliced marinated lamb, Korean style'},{id:'f',role:'price',text:'350 lei'},{id:'g',role:'price',text:'200g'}]};
test('readable translation groups parallel descriptions and headings, preserves dish and amount boundaries',()=>{
 const groups=translationGroups(document,true);assert.deepEqual(groups.map(g=>g.ids),[['a','b'],['c'],['d','e']]);assert.equal(translationGroups(document,false).length,5);
});
test('reject English falsely labelled Italian but allow Italian descriptions and short proper names',()=>{
 const en='Thinly sliced duck breast marinated in Korean style. Boneless chicken thigh marinated in Korean style. Marinated lamb ribs in Korean sauce. Served raw and grilled at the table.';
 assert.equal(wrongTranslationLanguage(en,'it'),true);assert.equal(wrongTranslationLanguage(en,'en'),false);
 assert.equal(wrongTranslationLanguage('Petto di anatra marinato in stile coreano, tagliato a fettine sottili. Coscia di pollo disossata marinata in stile coreano. Costolette di agnello marinate in salsa coreana.','it'),false);
 assert.equal(wrongTranslationLanguage('Lamb Bulgogi','it'),false);
});
test('translation preserves prices, weights, allergen numbers and retries invalid numeric output',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({a:'Agnello',c:calls===1?'Bulgogi di agnello 9,11':'Bulgogi di agnello 8,11',d:'Agnello marinato in stile coreano, tagliato a fettine sottili'})}]}]})};
 try{const result=await translateDocument(document,'it','test',{readable:true});assert.equal(calls,2);assert.equal(result.texts.f,'350 lei');assert.equal(result.texts.g,'200g');assert.deepEqual(result.hiddenIds,['b','e']);assert.equal(result.revision,translationRevision);}finally{globalThis.fetch=original;}
});
