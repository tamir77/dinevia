import test from 'node:test';
import assert from 'node:assert/strict';
import {tasteCopy,tasteDirection,tasteCacheKey} from '../lib/taste-copy.ts';
import {validateSuggestions,rateDish} from '../lib/taste.ts';
test('Hebrew taste copy covers every English hint and uses RTL',()=>{
 const en=tasteCopy('en'),he=tasteCopy('he-IL');
 assert.deepEqual(Object.keys(he),Object.keys(en));
 for(const key of Object.keys(en))if(typeof en[key]==='string')assert.match(he[key],/[\u0590-\u05ff]/,key);
 for(const label of Object.keys(en.labels))assert.match(he.labels[label],/[\u0590-\u05ff]/);
 assert.equal(tasteDirection('he-IL'),'rtl');assert.equal(tasteDirection('en'),'ltr');
});
test('recommendation cache isolates language, menu version, rules and preferences',()=>{
 const p={love:[],avoid:[],never:['fish']},args=['m',1,'he','v1',p],key=tasteCacheKey(...args);
 for(const [index,value] of [[0,'other'],[1,2],[2,'en'],[3,'v2'],[4,{...p,never:['mushrooms']}]]){
  const changed=[...args];changed[index]=value;assert.notEqual(tasteCacheKey(...changed),key);
 }
 assert.equal(tasteCacheKey(...args),key);
});
test('translated ingredient labels do not mutate user preferences, evidence or ranking',()=>{
 const p={love:[],avoid:[],never:['fish']},blocks=[{id:'t0',text:'Salmon with rice'}];
 const value={preferenceLabels:{'never:0':'דגים'},dishes:[{name:'Salmon with rice',nameBlock:'t0',contextIds:['t0'],matches:[{preferenceId:'never:0',blockId:'t0',quote:'Salmon',basis:'category',reason:'סלמון הוא דג.'}],uncertainties:[]}]};
 const checked=validateSuggestions(value,blocks,p);
 assert.equal(checked.preferenceLabels['never:0'],'דגים');assert.equal(checked.dishes[0].matches[0].quote,'Salmon');
 assert.equal(rateDish(checked.dishes[0],p).label,'Not for you');assert.deepEqual(p.never,['fish']);
 assert.throws(()=>validateSuggestions({...value,preferenceLabels:{'never:99':'דגים'}},blocks,p));
});
