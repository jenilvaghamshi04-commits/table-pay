import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import vm from 'node:vm';
test('Render opens without login, disk or external API',async()=>{
 const port=22500+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['app-server/node.mjs'],{env:{...process.env,RENDER:'true',PORT:String(port),DATA_DIR:'/not-mounted'},stdio:['ignore','pipe','pipe']});
 try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,30))}assert(ready);
  const r=await fetch(base+'/admin');assert.equal(r.status,200);const html=await r.text();assert(!html.includes("request('/api/auth/login'"));assert(!html.includes('SALON_API_ORIGIN'));assert(html.includes('Records stay in this browser'));assert(!html.includes('sync across its signed-in devices'));
  assert.equal((await fetch(base+'/api/workspace')).status,404);assert.equal((await fetch(base+'/api/auth/login',{method:'POST'})).status,405);
  const app=html.match(/<script id="salonAppCode" type="text\/plain">([\s\S]*?)<\/script>/)[1];new vm.Script(app);
  const boot=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));let injected='';const elements=new Map(),values=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{textContent:id==='salonAppCode'?app:'',remove(){this.removed=true}});return elements.get(id)};
  const context={window:{},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>({}),body:{classList:{remove(){},add(){}},appendChild(s){injected=s.textContent}}},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},alert(){throw Error('Unexpected storage error')}};
  vm.runInNewContext(boot,context);assert.equal(injected,app);assert(element('authRoot').removed);assert.equal(context.window.__IS_OWNER,false);context.window.__CLOUD_STORAGE.setItem('salondesk-visits-v1','[]');assert.equal(values.get('salondesk-visits-v1'),'[]');assert.equal(element('syncState').textContent,'Saved in this browser');
 }finally{const ended=once(child,'exit');child.kill();await ended}
});
