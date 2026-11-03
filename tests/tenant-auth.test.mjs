import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'salon-auth-test-'));
const password='Test-'+crypto.randomUUID();
const port=19500+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['app-server/node.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,OWNER_EMAIL:'owner@example.test',OWNER_PASSWORD:password},stdio:['ignore','pipe','pipe']});
let logs='';child.stderr.on('data',b=>logs+=b);child.stdout.on('data',b=>logs+=b);
async function call(endpoint,{method='GET',data,cookie,origin=base}={}){const r=await fetch(base+endpoint,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json',Origin:origin}:{})},body:data?JSON.stringify(data):undefined});return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers}}
async function login(email,pw){return call('/api/auth/login',{method:'POST',data:{email,password:pw}})}
test('server-enforced multi-salon authentication and isolation',async()=>{try{
 let up=false;for(let i=0;i<100;i++){try{const r=await fetch(base+'/health');if(r.ok){up=true;break}}catch{}await new Promise(r=>setTimeout(r,40))}assert(up,logs);
 assert.equal((await call('/api/workspace')).status,401);
 assert.equal((await call('/api/admin/overview')).status,401);
 let owner=await login('owner@example.test',password);assert.equal(owner.status,200);assert(owner.cookie);assert(owner.headers.get('set-cookie').includes('HttpOnly'));
 assert.equal((await call('/api/admin/overview',{cookie:owner.cookie})).status,403); // forced first change
 let p=await call('/api/auth/password',{method:'POST',cookie:owner.cookie,data:{currentPassword:password,password:password+'changed'}});assert.equal(p.status,200);
 assert.equal((await call('/api/me',{cookie:owner.cookie})).status,401);owner=await login('owner@example.test',password+'changed');
 async function make(name,email){const r=await call('/api/admin/salons',{method:'POST',cookie:owner.cookie,data:{name,email,password:password,fee:499}});assert.equal(r.status,201);return r.body.id}
 const a=await make('Salon A','a@example.test'),b=await make('Salon B','b@example.test');
 let client=await login('a@example.test',password);assert.equal(client.status,200);assert.equal((await call('/api/workspace',{cookie:client.cookie})).status,403);
 await call('/api/auth/password',{method:'POST',cookie:client.cookie,data:{currentPassword:password,password:password+'client'}});client=await login('a@example.test',password+'client');
 assert.equal((await call('/api/admin/overview',{cookie:client.cookie})).status,403);
 assert.equal((await call('/api/workspace?workspace='+b,{cookie:client.cookie})).status,403);
 assert.equal((await call('/api/admin/salons/'+b+'/status',{method:'POST',cookie:client.cookie,data:{status:'suspended'}})).status,403);
 let state=await call('/api/workspace',{cookie:client.cookie});assert.equal(state.status,200);assert.equal(state.body.tenant.id,a);
 const data={...state.body.data,'salondesk-team-v1':JSON.stringify(['Private A'])};let saved=await call('/api/workspace',{method:'PUT',cookie:client.cookie,data:{data,version:0}});assert.equal(saved.status,200);
 assert.equal((await call('/api/workspace',{method:'PUT',cookie:client.cookie,data:{data,version:0}})).status,409);
 assert.equal((await call('/api/workspace',{method:'PUT',cookie:client.cookie,origin:'https://evil.example',data:{data,version:1}})).status,403);
 assert.equal((await call('/api/workspace',{method:'PUT',cookie:client.cookie,data:{data:{notAllowed:'{}'},version:1}})).status,400);
 let other=await call('/api/workspace?workspace='+b,{cookie:owner.cookie});assert(!other.body.data['salondesk-team-v1']);
 assert.equal((await call('/api/admin/salons/'+a+'/status',{method:'POST',cookie:owner.cookie,data:{status:'suspended'}})).status,200);
 assert.equal((await call('/api/me',{cookie:client.cookie})).status,401);assert.equal((await call('/api/workspace',{cookie:client.cookie})).status,401);assert.equal((await login('a@example.test',password+'client')).status,401);
 await call('/api/admin/salons/'+a+'/status',{method:'POST',cookie:owner.cookie,data:{status:'active'}});client=await login('a@example.test',password+'client');assert.equal(client.status,200);state=await call('/api/workspace',{cookie:client.cookie});assert.equal(JSON.parse(state.body.data['salondesk-team-v1'])[0],'Private A');
 await call('/api/admin/salons/'+a+'/password',{method:'POST',cookie:owner.cookie,data:{password:password+'reset'}});assert.equal((await call('/api/me',{cookie:client.cookie})).status,401);assert.equal((await login('a@example.test',password+'client')).status,401);client=await login('a@example.test',password+'reset');assert.equal(client.body.user.mustChange,true);
 await call('/api/admin/salons/'+b+'/status',{method:'POST',cookie:owner.cookie,data:{status:'archived'}});assert.equal((await login('b@example.test',password)).status,401);
 const overview=await call('/api/admin/overview',{cookie:owner.cookie});assert.equal(overview.body.salons.length,2);assert(overview.body.audit.some(a=>a.action==='salon_suspended'));assert(!JSON.stringify(overview.body).includes(password));
 for(let i=0;i<9;i++)p=await login('wrong@example.test','not-the-password');assert.equal(p.status,429);
 const spoof=await fetch(base+'/api/admin/overview',{headers:{'oai-authenticated-user-email':'owner@example.test'}});assert.equal(spoof.status,401);
 console.log('Verified: tenant isolation, role checks, forced password change, session revocation, archive, reset, CSRF, rate limits, optimistic versioning and persistent records.');
 }finally{child.kill();await new Promise(r=>child.once('exit',r));rmSync(dir,{recursive:true,force:true})}});
