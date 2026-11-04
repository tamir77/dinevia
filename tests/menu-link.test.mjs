import test from 'node:test';
import assert from 'node:assert/strict';
import {menuLink} from '../lib/client-menu-link.ts';
test('local QR uses the paired phone URL without fixing a guest language',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({url:'http://192.168.1.2:5179/pair?key=test&menu=menu-id'}));
 const r=await menuLink('menu-id','http://127.0.0.1:5178');assert(r.url.includes('/pair?'));assert(r.url.includes('menu=menu-id'));assert(!r.url.includes('lang='));
});
test('offline bridge falls back clearly; hosted links stay on their own origin',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({},{status:404}));
 assert.equal((await menuLink('id','http://127.0.0.1:5178')).url,'http://127.0.0.1:5178/menu/id');
 assert.equal((await menuLink('id','https://menu.example')).url,'https://menu.example/menu/id');
});
