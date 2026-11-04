import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {publicDemo} from '../scripts/public-demo.mjs';

test('public demo supports Safari byte ranges, seeking, HEAD and invalid ranges',async()=>{
 const server=createServer(async(req,res)=>{if(!await publicDemo(req,res,'public/demo')){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/demo/dinevia-demo.mp4`;
 try{
  let r=await fetch(url,{method:'HEAD'});assert.equal(r.status,200);const size=Number(r.headers.get('content-length'));assert(size>0);assert.equal(r.headers.get('accept-ranges'),'bytes');
  r=await fetch(url,{headers:{Range:'bytes=0-1023'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes 0-1023/${size}`);assert.equal((await r.arrayBuffer()).byteLength,1024);
  r=await fetch(url,{headers:{Range:'bytes=-512'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes ${size-512}-${size-1}/${size}`);assert.equal((await r.arrayBuffer()).byteLength,512);
  r=await fetch(url,{headers:{Range:`bytes=${size}-`}});assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),`bytes */${size}`);await r.text();
  r=await fetch(url,{method:'HEAD',headers:{Range:'bytes=0-1'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-length'),'2');assert.equal((await r.text()).length,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
