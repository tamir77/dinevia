import test from 'node:test';
import assert from 'node:assert/strict';
import {metaRequest} from '../lib/meta-request.ts';

test('missing Spark version retries once with same-provider Standard compatibility model',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  calls.push({url,body:JSON.parse(init.body),headers:init.headers});
  return calls.length===1?Response.json({error:{code:'model_not_found'}},{status:404}):Response.json({status:'completed'});
 });
 const response=await metaRequest('test-key',{model:'muse-spark-1.3',input:'owned test',max_output_tokens:100},AbortSignal.timeout(1000));
 assert.equal(response.status,200);assert.equal(calls.length,2);
 assert.equal(calls[0].url,calls[1].url);assert.equal(calls[1].body.model,'muse-spark-1.1');
 assert.equal(calls[1].body.input,'owned test');assert.deepEqual(calls[0].headers,calls[1].headers);
});
test('authentication errors and image-generation models never trigger a Spark fallback',async t=>{
 for(const [status,model] of [[401,'muse-spark-1.3'],[404,'muse-image-1.0']]){
  let calls=0;
  const mock=t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({error:{code:'model_not_found'}},{status});});
  const response=await metaRequest('test-key',{model,input:'owned test'},AbortSignal.timeout(1000));
  assert.equal(response.status,status);assert.equal(calls,1);mock.mock.restore();
 }
});
