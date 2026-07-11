import fs from 'node:fs';
const root=new URL('../',import.meta.url),issues=[],read=f=>fs.readFileSync(new URL(f,root),'utf8');
const html=read('www/index.html'),sw=read('www/sw.js'),pkg=JSON.parse(read('package.json'));
if(pkg.version!=='3.3.0')issues.push(`versão incorreta: ${pkg.version}`);
for(const asset of ['management-v11.js','calendar-v12.js','media-v13.js','match-v20.js','review-fixes-v20.js','awards-v21.js','offline-careers-v30.js','offline-start-v30.js','storage-namespace.js','multiplayer-v31.js','preflight-v32.js','hardening-v32.js','trophy-art-v33.js','automation-v33.js','awards-v33.js','match-v33.js','release-v33.js','v20.css','v21.css','v30.css','v31.css','v32.css','v33.css']){if(!html.includes(asset))issues.push(`${asset} ausente do index`);if(!sw.includes(asset))issues.push(`${asset} ausente do cache`);}
if(html.indexOf('storage-namespace.js')>html.indexOf('core.js'))issues.push('namespace deve carregar antes do núcleo');
if(html.indexOf('preflight-v32.js')>html.indexOf('core.js'))issues.push('preflight deve carregar antes do núcleo');
const compat=read('www/v04-compat.js');if(compat.includes('__v04ClampGuard'))issues.push('monkey patch global de clamp ainda presente');
const fixes=read('www/review-fixes-v20.js');for(const marker of ['Sub-15','Sub-17','Sub-20','fanLimits','__v20Bundle','seasonRevenue'])if(!fixes.includes(marker))issues.push(`correção ausente: ${marker}`);
if(issues.length)throw new Error(issues.join('\n'));
console.log(JSON.stringify({version:pkg.version,assets:23,status:'review-ok'}));
