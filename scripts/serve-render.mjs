// Portable hackathon host for the compiled Workers application. No dev server,
// mock login, source-file serving, or secret-bearing client bundle is exposed.
import {Miniflare} from 'miniflare';
import {createServer} from 'node:http';
import {readFile,mkdir,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Readable} from 'node:stream';
import {importUrlHandler} from './vite/menu-url-import.ts';

const port=Number(process.env.PORT||5180);
const origin=new URL(process.env.RENDER_EXTERNAL_URL||`http://127.0.0.1:${port}`).origin;
const state=resolve(process.env.DINEVIA_DATA_DIR||'.sites-runtime/render-data');
await mkdir(state,{recursive:true});
const moduleFiles=(await readdir('dist/server',{recursive:true})).filter(name=>/\.m?js$/.test(name));
const modules=['index.js',...moduleFiles.filter(name=>name!=='index.js')].map(name=>({type:'ESModule',path:resolve('dist/server',name)}));
const runtime=new Miniflare({
 name:'dinevia',host:'127.0.0.1',port:0,modules,
 scriptPath:resolve('dist/server/index.js'),modulesRoot:resolve('dist/server'),
 modulesRules:[{type:'ESModule',include:['**/*.js','**/*.mjs']}],
 compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
 bindings:{MODEL_API_KEY:process.env.MODEL_API_KEY||''},
 d1Databases:{DB:'dinevia'},d1Persist:resolve(state,'d1'),
 r2Buckets:['BUCKET'],r2Persist:resolve(state,'r2'),
 assets:{directory:resolve('dist/client'),routerConfig:{has_user_worker:true}},
});
await runtime.ready;
const db=await runtime.getD1Database('DB');
const migration=(await readFile('drizzle/0000_clear_archangel.sql','utf8')).replaceAll('CREATE TABLE `','CREATE TABLE IF NOT EXISTS `');
for(const statement of migration.split('--> statement-breakpoint'))await db.exec(statement.replaceAll('\n',' '));
let imports=0;
const importer=importUrlHandler(origin);
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url||'/',origin).pathname;
  if(path==='/healthz'){await db.prepare('SELECT 1').first();res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}
  if(['/signin-with-chatgpt','/signout-with-chatgpt','/callback','/api/phone-link'].includes(path)||path.startsWith('/api/account')){res.writeHead(404);res.end('Not available');return;}
  if(path==='/api/import-url'){
   if(imports>=4){res.writeHead(429,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Menu imports are busy. Please try again shortly.'}));return;}
   imports++;try{await importer(req,res,()=>{res.writeHead(404);res.end();});}finally{imports--;}return;
  }
  const headers=new Headers();
  for(const [name,value] of Object.entries(req.headers)){
   if(/^(?:host|connection|content-length|transfer-encoding|forwarded|x-forwarded-.*|oai-.*|cf-.*)$/i.test(name)||value===undefined)continue;
   headers.set(name,Array.isArray(value)?value.join(', '):value);
  }
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>26*1024*1024){res.writeHead(413);res.end('Menu too large');return;}chunks.push(chunk);}
  const response=await runtime.dispatchFetch(new URL(req.url||'/',origin).href,{method:req.method,headers,body:['GET','HEAD'].includes(req.method||'GET')?undefined:Buffer.concat(chunks)});
  const outgoing={};for(const [key,value] of response.headers){if(key!=='set-cookie')outgoing[key]=value;}
  const cookies=response.headers.getSetCookie();if(cookies.length)outgoing['set-cookie']=cookies;
  res.writeHead(response.status,outgoing);
  if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
 }catch(error){console.error('Request failed:',error instanceof Error?error.message:'unknown error');if(!res.headersSent)res.writeHead(503);res.end('Temporarily unavailable');}
});
server.requestTimeout=300000;
server.listen(port,process.env.RENDER?'0.0.0.0':'127.0.0.1',()=>console.log('Dinevia is ready'));
async function shutdown(){server.close();await runtime.dispose();process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
