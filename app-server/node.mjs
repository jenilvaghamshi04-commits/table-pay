import http from 'node:http';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original=readFileSync(path.join(root,'index.html'),'utf8');
const localBoot=`(()=>{
 const byId=id=>document.getElementById(id);
 window.__TENANT={id:'browser-local',name:'My salon'};window.__IS_OWNER=false;
 window.__CLOUD_STORAGE={getItem:k=>localStorage.getItem(k),setItem(k,v){try{localStorage.setItem(k,v);byId('syncState').textContent='Saved in this browser'}catch(e){byId('syncState').textContent='Not saved — storage full or blocked';alert('Unable to save. Browser storage is full or blocked. Export a backup before continuing.');throw e}}};
 window.exportBrowserBackup=()=>{const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('salondesk-'))data[k]=localStorage.getItem(k)}const blob=new Blob([JSON.stringify({format:'salondesk-browser-v1',exported:new Date().toISOString(),data},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='salon-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 byId('authRoot').remove();byId('ownerRoot').remove();document.body.classList.remove('auth-pending');document.body.classList.add('workspace-ready');
 byId('cloudAccountLabel').textContent='Browser workspace';byId('syncState').textContent='Saved in this browser';
 byId('ownerWorkspaceReturn').remove();
 document.querySelectorAll('[onclick="salonSignOut()"]').forEach(button=>{button.textContent='Export backup';button.setAttribute('onclick','exportBrowserBackup()')});
 const script=document.createElement('script');script.textContent=byId('salonAppCode').textContent;document.body.appendChild(script);
})();`;
// Keep the salon UI and invoice renderer; replace only the server authentication boot.
const marker='</script><script>(()=>{';
const split=original.lastIndexOf(marker);
if(split<0)throw Error('Salon app bootstrap marker is missing.');
let html=original.slice(0,split)+'</script><script>'+localBoot+'</script></html>';
html=html.replace(/<div class="panel"><h2>Workspace & account<\/h2>[\s\S]*?(?=<div class="settings-grid">)/,'<div class="panel"><h2>Browser workspace</h2><p>No login is required. Records stay in this browser on this device. Clearing browser data removes them; export backups regularly.</p><button class="btn light" onclick="exportBrowserBackup()">Export backup</button><span id="legacyImportButton" class="hidden"></span></div>');
html=html.replace('Membership balances are stored in your salon’s server workspace and sync across its signed-in devices.','Membership balances are saved in this browser only. Export backups regularly.');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'};
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers);return res.end('Method not allowed')}
 if(url.pathname==='/health'){res.writeHead(200,{...headers,'Content-Type':'application/json'});return res.end(req.method==='HEAD'?'':'{"status":"ok","storage":"browser-local","login":false}')}
 if(!['/','/admin','/index.html'].includes(url.pathname)){res.writeHead(404,headers);return res.end('Not found')}
 res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?'':html);
});
server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Salon Desk: no login, browser-local records, no disk or external database required'));
