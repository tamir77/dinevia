import test from 'node:test';
import assert from 'node:assert/strict';
import {addPreference,emptyPreferences,preferencesSchema,rateDish,validateSuggestions} from '../lib/taste.ts';
const blocks=[{id:'t0',text:'Chicken salad'},{id:'t1',text:'Chicken, tomatoes, fried onions'}];
const prefs={love:['tomatoes'],avoid:['olives'],never:['chicken']};
const dish={name:'Chicken salad',nameBlock:'t0',contextIds:['t0','t1'],matches:[{preferenceId:'love:0',blockId:'t1',quote:'tomatoes',basis:'explicit',reason:'Tomatoes are listed.'},{preferenceId:'never:0',blockId:'t1',quote:'Chicken',basis:'explicit',reason:'Chicken is listed.'}],uncertainties:[]};
test('hard exclusions outrank loved ingredients; uncertainty cannot become a great match',()=>{
 assert.equal(rateDish(dish,prefs).label,'Not for you');
 const positive={...dish,matches:[dish.matches[0]]};assert.equal(rateDish(positive,prefs).label,'Great match');
 assert.equal(rateDish({...positive,uncertainties:[{preferenceId:'never:0',blockId:'t1',quote:'Chicken',reason:'The filling is offered in two variants.'}]},prefs).label,'Ask your host');
 assert.equal(rateDish({...positive,matches:[],uncertainties:[]},prefs).label,'Worth a look');
});
test('suggestions must cite actual menu text and the supplied preferences',()=>{
 assert.equal(validateSuggestions({dishes:[dish]},blocks,prefs).dishes.length,1);
 for(const invalid of [{...dish,name:'Invented dish'},{...dish,matches:[{...dish.matches[1],quote:'mushrooms'}]},{...dish,contextIds:['t0'],matches:dish.matches},{...dish,uncertainties:[{preferenceId:'never:99',blockId:'t1',quote:'Chicken',reason:'Unknown filling.'}]}])assert.throws(()=>validateSuggestions({dishes:[invalid]},blocks,prefs));
 assert.throws(()=>validateSuggestions({dishes:[dish,dish]},blocks,prefs));
});
test('preferences move between groups without losing preparation details',()=>{
 let value=addPreference(emptyPreferences(),'love','  Fried onions  ');value=addPreference(value,'never','fried onions');
 assert.deepEqual(value.love,[]);assert.deepEqual(value.never,['fried onions']);
 value=addPreference(value,'avoid','onions');assert.deepEqual(value.avoid,['onions']);assert.deepEqual(value.never,['fried onions']);
 assert.equal(preferencesSchema.safeParse({...value,never:Array(9).fill('item')}).success,false);
 assert.equal(preferencesSchema.safeParse({love:['x'.repeat(51)],avoid:[],never:[]}).success,false);
});


test('category and recipe evidence exclude dishes without requiring the literal preference word',()=>{
 const p={love:['rice'],avoid:[],never:['fish']};
 const source=[{id:'t0',text:'Salmon with rice'},{id:'t1',text:'Vitello tonnato'}];
 const values={dishes:[
  {name:'Salmon with rice',nameBlock:'t0',contextIds:['t0'],matches:[{preferenceId:'never:0',blockId:'t0',quote:'Salmon',basis:'category',reason:'Salmon is fish.'}],uncertainties:[]},
  {name:'Vitello tonnato',nameBlock:'t1',contextIds:['t1'],matches:[{preferenceId:'never:0',blockId:'t1',quote:'Vitello tonnato',basis:'recipe',reason:'Usually served with tuna sauce.'}],uncertainties:[]}
 ]};
 for(const d of validateSuggestions(values,source,p).dishes)assert.equal(rateDish(d,p).label,'Not for you');
});
test('uncertainty requires a source quote and a reason; a confirmed match takes precedence',()=>{
 const p={love:[],avoid:[],never:['mushrooms']};const source=[{id:'t0',text:'Ravioli with meat or mushroom filling'}];
 const d={name:source[0].text,nameBlock:'t0',contextIds:['t0'],matches:[],uncertainties:[{preferenceId:'never:0',blockId:'t0',quote:'meat or mushroom filling',reason:'The menu offers two fillings; the selected filling is unspecified.'}]};
 const validated=validateSuggestions({dishes:[d]},source,p).dishes[0];assert.equal(rateDish(validated,p).label,'Ask your host');assert.match(rateDish(validated,p).needsCheck[0].reason,/two fillings/);
 for(const uncertainty of [{...d.uncertainties[0],quote:'unknown sauce'},{...d.uncertainties[0],reason:''}])assert.throws(()=>validateSuggestions({dishes:[{...d,uncertainties:[uncertainty]}]},source,p));
 const confirmed=validateSuggestions({dishes:[{...d,matches:[{...d.uncertainties[0],basis:'explicit',reason:'Mushroom filling is selected.'}]}]},source,p).dishes[0];assert.equal(confirmed.uncertainties.length,0);assert.equal(rateDish(confirmed,p).label,'Not for you');
 assert.throws(()=>validateSuggestions({dishes:[{...d,uncertainties:undefined,uncertainIds:['never:0']}]},source,p));
});
