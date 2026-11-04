import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,randomToken,tokenHash} from '../lib/password.ts';
import {preferredLanguage} from '../lib/preferred-language.ts';
import {imageMime,numberTokens} from '../lib/photo.ts';
test('passwords use salted hashes and reject incorrect credentials',async()=>{
 const password='Test only password with enough length';
 const hash=await hashPassword(password);
 assert(!hash.includes(password));assert(await verifyPassword(password,hash));assert.equal(await verifyPassword('wrong password',hash),false);
 assert.notEqual(await hashPassword(password),hash);
 const token=randomToken();assert.match(token,/^[a-f0-9]{64}$/);assert.notEqual(tokenHash(token),token);assert.equal(tokenHash(token),tokenHash(token));
});
test('chooses a supported guest language without assuming a country',()=>{
 assert.equal(preferredLanguage(['pl-PL','en-US']),'en');assert.equal(preferredLanguage(['he-IL']),'en');assert.equal(preferredLanguage(['xx-ZZ','fr-CA']),'fr');assert.equal(preferredLanguage(['xx-ZZ']),'en');
});
test('validates photo signatures and detects changed, added and missing prices',()=>{
 assert.equal(imageMime(Uint8Array.from([255,216,255,0])),'image/jpeg');assert.equal(imageMime(new TextEncoder().encode('<html>')) ,null);
 assert.deepEqual(numberTokens(['80 MDL','90 MDL']),numberTokens(['90 MDL','80 MDL']));
 assert.notDeepEqual(numberTokens(['80 MDL','90 MDL']),numberTokens(['80 MDL','95 MDL']));
 assert.notDeepEqual(numberTokens(['80 MDL','90 MDL']),numberTokens(['80 MDL']));
 assert.notDeepEqual(numberTokens(['80 MDL']),numberTokens(['8o MDL']));
});
