import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAddress,parseSourceUrl} from '../scripts/vite/menu-url-import.ts';
test('blocks local networks and alternate URL representations',()=>{
 for(const address of ['127.0.0.1','10.1.2.3','172.20.0.1','192.168.1.2','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001::1','2001:0000::1','2001:db8::1','2002:7f00:1::','3fff::1'])assert.equal(publicAddress(address),false,address);
 for(const url of ['http://2130706433/menu.pdf','http://127.1/menu.pdf','https://user:secret@example.com/menu.pdf','file:///etc/passwd','http://localhost/','http://foo.local/','https://example.com:8443/'])assert.throws(()=>parseSourceUrl(url),url);
 assert.equal(publicAddress('1.1.1.1'),true);assert.equal(publicAddress('2606:4700:4700::1111'),true);
});
