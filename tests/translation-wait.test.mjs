import test from 'node:test';
import assert from 'node:assert/strict';
import {requestTranslation} from '../lib/client-translation.ts';
test('joins an existing translation using read-only polling without starting another job',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,method:options?.method||'GET'});return calls.length===1?Response.json({error:'already running'},{status:409}):Response.json({state:'ready',data:{language:'pl',texts:{t0:'Zupa'}}})});
 const result=await requestTranslation('menu-id','pl');assert.equal(result.data.texts.t0,'Zupa');assert.deepEqual(calls.map(c=>c.method),['POST','GET']);assert(calls[1].url.includes('/translation?language=pl'));
});
test('reports a failed shared translation instead of polling indefinitely',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>++calls===1?Response.json({error:'running'},{status:409}):Response.json({state:'failed'}));
 await assert.rejects(requestTranslation('menu-id','he'),/did not finish/);assert.equal(calls,2);
});
