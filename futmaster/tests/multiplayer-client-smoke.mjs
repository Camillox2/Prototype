import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=f=>fs.readFileSync(new URL(f,root),'utf8');
const html=read('www/index.html'),sw=read('www/sw.js'),client=read('www/multiplayer-v31.js'),storage=read('www/storage-namespace.js'),server=read('multiplayer/server.mjs');
const issues=[];
for(const asset of ['storage-namespace.js','multiplayer-v31.js','v31.css']){if(!html.includes(asset))issues.push(`${asset} ausente do HTML`);if(!sw.includes(asset))issues.push(`${asset} ausente do cache`);}
if(html.indexOf('storage-namespace.js')>html.indexOf('core.js'))issues.push('namespace carrega depois do core');
for(const marker of ['same-league','multi-league','shared-club','claim-club','permissions','ready','publish','reconnect','FMStorageNamespace'])if(!client.includes(marker)&&!storage.includes(marker))issues.push(`cliente sem ${marker}`);
for(const marker of ['maxPayload','rateLimit','STALE_REVISION','FUTMASTER_ROOMS_FILE','WebSocketServer'])if(!server.includes(marker))issues.push(`servidor sem ${marker}`);
if(!storage.includes('fmroom:')||!storage.includes("mode==='multiplayer'"))issues.push('namespace de sala ausente');
if(issues.length)throw new Error(issues.join('\n'));
console.log(JSON.stringify({status:'multiplayer-client-ok',modes:3,isolatedStorage:true}));
