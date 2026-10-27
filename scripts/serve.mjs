// Loopback-only production preview/test server. This file is never deployed.
import http from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
const root=resolve('dist'),base='/freiraum-pwa/';let generation=0,offline=false;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='POST'&&url.pathname==='/__test/offline'){offline=url.searchParams.get('enabled')==='1';res.writeHead(200);res.end('ok');return;}
  if(req.method==='POST'&&url.pathname==='/__test/update'){generation++;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({generation}));return;}
  if(offline){req.socket.destroy();return;}
  if(url.pathname==='/'){res.writeHead(302,{Location:base});res.end();return;}
  if(!url.pathname.startsWith(base)){res.writeHead(404);res.end();return;}
  const relative=decodeURIComponent(url.pathname.slice(base.length))||'index.html';
  const path=resolve(root,relative);
  if(!path.startsWith(root+ '/')&&!path.startsWith(root+'\\')){res.writeHead(403);res.end();return;}
  try{if(!(await stat(path)).isFile())throw new Error();let content=await readFile(path);if(relative==='sw.js'&&generation)content=Buffer.from(content.toString().replace(/const VERSION = "([^"]+)";/,`const VERSION = "$1-test${generation}";`));res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store'});res.end(content);}catch{res.writeHead(404);res.end();}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173/freiraum-pwa/'));
