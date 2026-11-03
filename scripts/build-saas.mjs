import {readFileSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
const core=readFileSync('app-server/core.mjs','utf8').replace(/export /g,'');
const html=JSON.stringify(readFileSync('index.html','utf8'));
const worker=`${core}\nconst APP_HTML=${html};\nexport default { async fetch(req,env){const url=new URL(req.url);if(url.pathname==='/health')return new Response('{"status":"ok"}',{headers:{'Content-Type':'application/json'}});if(url.pathname.startsWith('/api/'))return api(req,{...env,TRUST_PLATFORM_IDENTITY:true});if(!['/','/index.html','/admin'].includes(url.pathname))return new Response('Not found',{status:404});return new Response(req.method==='HEAD'?'':APP_HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}})}};\n`;
mkdirSync('worker',{recursive:true});writeFileSync('worker/index.js',worker);
// Standalone Cloudflare must never trust client-supplied platform identity headers.
writeFileSync('worker/cloudflare.js',worker.replace('TRUST_PLATFORM_IDENTITY:true','TRUST_PLATFORM_IDENTITY:false'));
rmSync('dist',{recursive:true,force:true});mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});writeFileSync('dist/server/index.js',worker);writeFileSync('dist/.openai/hosting.json',readFileSync('.openai/hosting.json'));
console.log('Built Worker with server-side API and embedded app');
