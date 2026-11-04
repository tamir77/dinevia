import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {phonePreview} from '../scripts/phone-preview.mjs';
const listen=s=>new Promise(resolve=>s.listen(0,'127.0.0.1',()=>resolve(s.address().port)));
const close=s=>new Promise(resolve=>{s.closeAllConnections();s.close(resolve)});
test('phone bridge requires pairing, rejects foreign origins and strips desktop login cookies',async()=>{
 let seen;
 const upstream=http.createServer((req,res)=>{seen={url:req.url,headers:req.headers};res.setHeader('Content-Type','application/json');res.end('{"ok":true}')});
 const upstreamPort=await listen(upstream),reservation=http.createServer(),port=await listen(reservation);await close(reservation);
 const {server,url}=phonePreview({host:'127.0.0.1',port,upstreamPort});
 await new Promise(r=>server.listen(port,'127.0.0.1',r));const base=`http://127.0.0.1:${port}`;
 try{
  assert.equal((await fetch(base+'/translate')).status,403);
  assert.equal((await fetch(base+'/pair?key='+encodeURIComponent('é'.repeat(48)))).status,403);
  const pair=await fetch(url,{redirect:'manual'});assert.equal(pair.status,303);assert.equal(pair.headers.get('location'),'/translate');
  const menuPair=await fetch(url+'&menu=12345678-1234-1234-1234-123456789abc',{redirect:'manual'});assert.equal(menuPair.headers.get('location'),'/menu/12345678-1234-1234-1234-123456789abc');
  const invalid=await fetch(url+'&menu=https://foreign.example',{redirect:'manual'});assert.equal(invalid.headers.get('location'),'/translate');
  const cookie=pair.headers.get('set-cookie').split(';')[0]+'; mp_guest=guest-test; __sites_local_auth=1';
  assert.equal((await fetch(base+'/api/guest-session',{method:'POST',headers:{cookie,Origin:'https://foreign.example'}})).status,403);
  assert.equal((await fetch(base+'/api/guest-session',{method:'POST',headers:{cookie}})).status,403);
  assert.equal((await fetch(base+'/signin-with-chatgpt',{headers:{cookie}})).status,403);
  const r=await fetch(base+'/api/guest-session',{method:'POST',headers:{cookie,Origin:base},body:'{}'});assert.equal(r.status,200);
  assert.equal(seen.headers.origin,`http://127.0.0.1:${upstreamPort}`);assert.equal(seen.headers.cookie,' mp_guest=guest-test'.trim());
 }finally{await close(server);await close(upstream)}
});
