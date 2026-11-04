// Manual live Meta evaluation: run with the local app running. Creates a private fictional menu and uses one recommendation request.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {rateDish} from '../lib/taste.ts';
const base='http://127.0.0.1:5178',headers={Origin:base,Cookie:'__sites_local_auth=1'};
const items=[
 ['Salmon with rice','Grilled salmon, rice and lemon','Not for you'],
 ['Somon la grătar','Orez și lămâie','Not for you'],
 ['Филе трески','С картофелем','Not for you'],
 ['Beef fillet with red-wine sauce','Beef, potatoes, red wine','Worth a look'],
 ['Grilled chicken breast','','Worth a look'],
 ['Pork steak with potatoes','','Worth a look'],
 ['Vitello tonnato','','Not for you'],
 ['Beef salad with anchovy dressing','Beef, leaves, anchovy dressing','Not for you'],
 ['Vegan carrot salmon bowl','Carrot-based salmon alternative, rice, vegan dressing','Worth a look'],
 ['Vegan Caesar salad','Plant-based dressing, lettuce, croutons','Worth a look'],
 ['Grilled shrimp','Shrimp, lemon, garlic','Worth a look'],
 ['Seafood risoni','Shrimp, squid, white wine, onion, parmesan foam','Worth a look'],
 ['Filet de bœuf au vin rouge','','Worth a look'],
 ['Seafood soup','Tomatoes and coconut milk; seafood mix unspecified','Ask your host'],
 ['Mushroom risotto','Rice, mushrooms, parmesan','Not for you'],
 ['Beef Wellington with duxelles','','Not for you'],
 ['Ravioli','Meat or mushroom filling; ask which filling is available today','Ask your host'],
 ['Tomato soup without mushrooms','Tomatoes, basil, olive oil','Worth a look'],
 ['Chicken with Caesar dressing','','Ask your host']
];
const blocks=items.flatMap(([name,description],i)=>[{id:`t${i*2}`,text:name,role:'dish'},...(description?[{id:`t${i*2+1}`,text:description,role:'description'}]:[])]);
const data={kind:'html',language:'en',sourceUrl:'https://example.com/taste-test',warnings:[],blocks};
const html='<html><body><main>'+blocks.map(b=>`<${b.role==='dish'?'h3':'p'}><!--mp-text:${b.id}-->${b.text}</${b.role==='dish'?'h3':'p'}>`).join('')+'</main></body></html>';
const f=new FormData();f.set('audience','restaurant');f.set('name','QA culinary reasoning — fictional menu');f.set('file',new File([html],'menu.html',{type:'text/html'}));f.set('layout',JSON.stringify(data));
const r=await fetch(base+'/api/menus',{method:'POST',headers,body:f}),menu=await r.json();assert(r.ok,JSON.stringify(menu));
const preferences={love:[],avoid:[],never:['Не ем рыбу','mushrooms']};
const start=performance.now();const response=await fetch(base+'/api/menu/'+menu.id+'/recommend',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({preferences,version:1})});const result=await response.json();assert(response.ok,JSON.stringify(result));
const report=items.map(([name,,expected])=>{const dish=result.dishes.find(d=>d.name===name);return {name,expected,actual:dish?rateDish(dish,preferences).label:'MISSING',reasons:dish?[...dish.matches,...dish.uncertainties].map(m=>m.reason):[]}});
writeFileSync('/tmp/taste-regression-results.json',JSON.stringify({id:menu.id,ms:Math.round(performance.now()-start),preferences,result,report},null,2));
console.log(JSON.stringify({id:menu.id,ms:Math.round(performance.now()-start),report},null,2));
for(const row of report)assert.equal(row.actual,row.expected,row.name);
