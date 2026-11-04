import http from 'node:http';
import net from 'node:net';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Temporary, paired LAN access; the main application stays on loopback.
export function phonePreview({host,port=5179,upstreamPort=5178,token=randomBytes(24).toString('hex')}){
 const origin=`http://${host}:${port}`,upstream=`http://127.0.0.1:${upstreamPort}`;
 const equal=value=>{if(typeof value!=='string')return false;const a=Buffer.from(value),b=Buffer.from(token);return a.length===b.length&&timingSafeEqual(a,b)};
 const paired=req=>(req.headers.cookie||'').split(';').some(c=>c.trim().startsWith('mp_phone=')&&equal(c.trim().slice(9)));
 const safeOrigin=req=>!req.headers.origin||req.headers.origin===origin;
 const headers=req=>({...req.headers,host:`127.0.0.1:${upstreamPort}`,
  ...(req.headers.origin?{origin:upstream}:{}),
  cookie:(req.headers.cookie||'').split(';').filter(c=>/^(mp_guest|mp_account)=/.test(c.trim())).join(';')});
 const fail=(res,status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message)};
 const server=http.createServer((req,res)=>{
  if(req.headers.host!==`${host}:${port}`||!safeOrigin(req))return fail(res,403,'Open the phone preview link supplied on your Mac.');
  const url=new URL(req.url,origin);
  if(url.pathname==='/pair'&&req.method==='GET'&&equal(url.searchParams.get('key'))){
   const menu=url.searchParams.get('menu'),destination=menu&&/^[a-f0-9-]{36}$/i.test(menu)?'/menu/'+menu:'/translate';
   res.writeHead(303,{Location:destination,'Set-Cookie':`mp_phone=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=14400`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});return res.end();
  }
  if(!paired(req))return fail(res,403,'Scan the QR code on your Mac to open this private phone preview.');
  if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)return fail(res,403,'Refresh the page and try again.');
  // Never expose the desktop's simulated host sign-in through the phone bridge.
  if(url.pathname.includes('signin-with-chatgpt')||url.pathname.includes('.dev.vars')||url.pathname.includes('.env'))return fail(res,403,'This desktop-only route is unavailable in the phone preview.');
  const proxy=http.request(upstream+req.url,{method:req.method,headers:headers(req)},reply=>{
   const h={...reply.headers,'Referrer-Policy':'no-referrer'};
   if(h.location?.startsWith(upstream))h.location=origin+h.location.slice(upstream.length);
   res.writeHead(reply.statusCode||502,h);reply.pipe(res);
  });
  proxy.on('error',()=>{if(!res.headersSent)fail(res,502,'The app on your Mac is not running.');else res.destroy()});
  req.on('aborted',()=>proxy.destroy());req.pipe(proxy);
 });
 server.on('upgrade',(req,socket,head)=>{
  if(req.headers.host!==`${host}:${port}`||!paired(req)||req.headers.origin!==origin){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return}
  const remote=net.connect(upstreamPort,'127.0.0.1',()=>{
   remote.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+Object.entries(headers(req)).filter(([,v])=>v!==undefined).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');
   if(head.length)remote.write(head);socket.pipe(remote);remote.pipe(socket);
  });
  remote.on('error',()=>socket.destroy());socket.on('error',()=>remote.destroy());socket.on('close',()=>remote.destroy());
 });
 return {server,url:`${origin}/pair?key=${token}`};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const host=process.argv[2];if(!host||!net.isIPv4(host)||!(/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)))throw Error('Supply the Mac’s private Wi-Fi IPv4 address.');
 let token;
 if(process.argv.includes('--reuse-pairing'))try{const saved=new URL(readFileSync('.sites-runtime/phone-preview-url.txt','utf8').trim());if(saved.hostname===host&&/^[a-f0-9]{48}$/.test(saved.searchParams.get('key')||''))token=saved.searchParams.get('key')}catch{}
 const {server,url}=phonePreview({host,token});
 server.listen(5179,host,()=>{mkdirSync('.sites-runtime',{recursive:true});writeFileSync('.sites-runtime/phone-preview-url.txt',url,{mode:0o600});console.log(`Phone preview listening on ${host}:5179; pairing link saved locally.`)});
 setTimeout(()=>{server.close();process.exit(0)},4*60*60*1000).unref();
}
