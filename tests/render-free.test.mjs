import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
test('Render free mode uses Cloudflare without a local database',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'salon-free-')),port=21500+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const mock=`globalThis.fetch=async(url,options)=>{if(url.includes('/api/unavailable'))throw Error('offline');return new Response(JSON.stringify({url,origin:options.headers.get('Origin'),cookie:options.headers.get('Cookie'),identity:options.headers.get('oai-authenticated-user-email'),body:options.body?.toString()}),{headers:{'Content-Type':'application/json','Set-Cookie':'salon_session=test; HttpOnly; Path=/; SameSite=Strict; Secure'}})};await import('./app-server/node.mjs');`;
 const child=spawn(process.execPath,['--input-type=module','-e',mock],{env:{...process.env,RENDER:'true',PORT:String(port),DATA_DIR:path.join(dir,'missing')},stdio:['ignore','pipe','pipe']});let logs='';child.stderr.on('data',b=>logs+=b);child.stdout.on('data',b=>logs+=b);
 try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,30))}assert(ready,logs);
  assert.equal((await fetch(base+'/admin')).status,200);assert(!existsSync(path.join(dir,'missing')));
  const rejected=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(rejected.status,403);
  const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:'https://127.0.0.1:'+port,'Content-Type':'application/json',Cookie:'salon_session=abc','oai-authenticated-user-email':'spoof@example.test'},body:'{}'});assert.equal(r.status,200);assert(r.headers.get('set-cookie').includes('HttpOnly'));const data=await r.json();assert.equal(data.url,'https://table-pay.jenilvaghamshi04.workers.dev/api/auth/login');assert.equal(data.origin,'https://table-pay.jenilvaghamshi04.workers.dev');assert.equal(data.cookie,'salon_session=abc');assert.equal(data.identity,null);assert.equal(data.body,'{}');
  assert.equal((await fetch(base+'/api/unavailable')).status,502);
 }finally{const exited=once(child,'exit');child.kill();await exited;rmSync(dir,{recursive:true,force:true})}
});
