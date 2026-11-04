import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex,hexToBytes} from '@noble/hashes/utils.js';
export async function hashPassword(password:string,salt=bytesToHex(crypto.getRandomValues(new Uint8Array(32)))){
 const hash=await pbkdf2Async(sha256,password,hexToBytes(salt),{c:600000,dkLen:32});
 return `pbkdf2-sha256:600000:${salt}:${bytesToHex(hash)}`;
}
export async function verifyPassword(password:string,stored:string){
 const [algorithm,iterations,salt]=stored.split(':');
 if(algorithm!=='pbkdf2-sha256'||iterations!=='600000'||!/^[a-f0-9]{64}$/.test(salt||''))return false;
 const actual=await hashPassword(password,salt);let diff=actual.length^stored.length;
 for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^(stored.charCodeAt(i)||0);
 return diff===0;
}
export function randomToken(){return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))}
export function tokenHash(token:string){return bytesToHex(sha256(new TextEncoder().encode(token)))}
