import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const media = {'dinevia-demo.mp4':'video/mp4','dinevia-poster.jpg':'image/jpeg','dinevia-en.vtt':'text/vtt; charset=utf-8'};

// Safari requests byte ranges when loading and seeking an MP4. Serve these
// explicitly because the Workers asset adapter can return the whole file.
export async function publicDemo(req, res, directory = 'dist/client/demo') {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (!path.startsWith('/demo/')) return false;
  const name = path.slice('/demo/'.length);
  if (!Object.hasOwn(media, name)) return false;
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}); res.end(); return true; }
  const file = resolve(directory, name);
  let size;
  try { size = (await stat(file)).size; } catch { res.writeHead(404); res.end(); return true; }
  const headers = {'Content-Type':media[name], 'Accept-Ranges':'bytes', 'Cache-Control':'public, max-age=0, must-revalidate', 'X-Content-Type-Options':'nosniff'};
  let start = 0, end = size - 1, status = 200;
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    let valid = !!match && !!(match[1] || match[2]);
    if (valid) {
      if (!match[1]) { const suffix=Number(match[2]); valid=Number.isSafeInteger(suffix)&&suffix>0; start=Math.max(0,size-suffix); }
      else { start=Number(match[1]); end=match[2] ? Math.min(Number(match[2]),size-1) : size-1; }
      valid = valid && Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start < size && end >= start;
    }
    if (!valid) { res.writeHead(416, {...headers,'Content-Range':`bytes */${size}`}); res.end(); return true; }
    status=206;
    headers['Content-Range']=`bytes ${start}-${end}/${size}`;
  }
  res.writeHead(status, {...headers,'Content-Length':end-start+1});
  if (req.method==='HEAD') res.end();
  else {
    const stream=createReadStream(file,{start,end});
    stream.on('error',()=>res.destroy());
    res.on('close',()=>stream.destroy());
    stream.pipe(res);
  }
  return true;
}
