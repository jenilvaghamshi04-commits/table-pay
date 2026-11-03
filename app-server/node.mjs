import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {api} from './core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Render's free filesystem is ephemeral. Keep all records in the Cloudflare D1 backend.
if(process.env.RENDER || process.env.SALON_API_ORIGIN){
 const upstream=new URL(process.env.SALON_API_ORIGIN||'https://table-pay.jenilvaghamshi04.workers.dev');
 if(upstream.protocol!=='https:'||upstream.username||upstream.password||upstream.pathname!=='/'||upstream.search||upstream.hash)throw Error('SALON_API_ORIGIN must be an HTTPS origin.');
 const html=readFileSync(path.join(root,'index.html'),'utf8');
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://'+req.headers.host);
  if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"status":"ok","storage":"cloudflare-d1"}')}
  if(url.pathname.startsWith('/api/')){
   // Check the browser origin before rewriting it for the fixed upstream API.
   const expected=(process.env.RENDER?'https:':url.protocol)+'//'+url.host;
   if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==expected){res.writeHead(403);return res.end('{"error":"Request origin is not allowed."}')}
   if(upstream.host===url.host){res.writeHead(503);return res.end('{"error":"API backend must be a separate Cloudflare host."}')}
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1600000){res.writeHead(413);return res.end('{"error":"Request too large."}')}chunks.push(chunk)}
   const headers=new Headers();if(req.headers.cookie)headers.set('Cookie',req.headers.cookie);if(req.headers['content-type'])headers.set('Content-Type',req.headers['content-type']);
   headers.set('Origin',upstream.origin);
   const response=await fetch(upstream.origin+url.pathname+url.search,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),redirect:'manual',signal:AbortSignal.timeout(20000)});
   const outgoing={'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
   const cookies=response.headers.getSetCookie();if(cookies.length)outgoing['Set-Cookie']=cookies;
   res.writeHead(response.status,outgoing);return res.end(req.method==='HEAD'?'':Buffer.from(await response.arrayBuffer()));
  }
  if(!['/','/index.html','/admin'].includes(url.pathname)){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?'':html);
 }catch(e){console.error('Cloudflare API connection failed:',e.message);if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"Cloudflare backend unavailable. Please try again."}')}});
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Salon Desk on Render: stateless frontend, Cloudflare D1 storage'));
}else{
const dir=process.env.DATA_DIR||path.join(root,'data');
if(process.env.RENDER&&!process.env.DATA_DIR)throw Error('Set DATA_DIR to a mounted persistent disk before starting.');
if(process.env.RENDER&&!existsSync(dir))throw Error('Persistent DATA_DIR does not exist. Attach the Render disk before starting.');
if(process.env.RENDER){const mounts=readFileSync('/proc/self/mountinfo','utf8').split('\n').map(line=>line.split(' ')[4]).filter(Boolean);if(!mounts.includes(path.resolve(dir)))throw Error('DATA_DIR must be the persistent disk mount path. An ordinary container folder is not durable.');}
mkdirSync(dir,{recursive:true});
const sqlite=new DatabaseSync(path.join(dir,'salon.sqlite'));sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS schema_versions (name TEXT PRIMARY KEY)');
if(!sqlite.prepare('SELECT name FROM schema_versions WHERE name=?').get('0000_salon_saas')){sqlite.exec('BEGIN IMMEDIATE');try{sqlite.exec(readFileSync(path.join(root,'drizzle/0000_salon_saas.sql'),'utf8'));sqlite.prepare('INSERT INTO schema_versions(name) VALUES (?)').run('0000_salon_saas');sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}
function prepared(sql,args=[]){return{bind(...values){return prepared(sql,values)},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return{results:sqlite.prepare(sql).all(...args)}},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}},sql,args}}
const DB={prepare:prepared,async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements){const r=sqlite.prepare(s.sql).run(...s.args);results.push({meta:{changes:Number(r.changes)}})}sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const html=readFileSync(path.join(root,'index.html'),'utf8');
const env={DB,OWNER_EMAIL:process.env.OWNER_EMAIL,OWNER_PASSWORD:process.env.OWNER_PASSWORD,TRUST_PLATFORM_IDENTITY:false};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://'+(req.headers.host||'localhost'));if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"status":"ok"}')}
 if(url.pathname.startsWith('/api/')){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>1600000){res.writeHead(413);return res.end('Request too large')}chunks.push(chunk)}const headers=new Headers();for(const[k,v]of Object.entries(req.headers)){if(k.startsWith('oai-')||k==='cf-connecting-ip')continue;if(v)headers.set(k,Array.isArray(v)?v.join(','):v)}const proto=process.env.RENDER?'https:':url.protocol;const request=new Request(proto+'//'+url.host+url.pathname+url.search,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const response=await api(request,{...env,CLIENT_IP:req.socket.remoteAddress});res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(Buffer.from(await response.arrayBuffer()))}
 if(!['/','/index.html','/admin'].includes(url.pathname)){res.writeHead(404);return res.end('Not found')}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?'':html)
}catch(e){console.error(e.message);res.writeHead(500);res.end('Server error')}});
server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Salon Desk server listening'));

}
