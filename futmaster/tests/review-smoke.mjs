import fs from 'node:fs';
const root=new URL('../',import.meta.url),issues=[];
const read=f=>fs.readFileSync(new URL(f,root),'utf8');
const html=read('www/index.html'),sw=read('www/sw.js'),pkg=JSON.parse(read('package.json'));
if(pkg.version!=='2.1.0')issues.push(`versão incorreta: ${pkg.version}`);
for(const asset of ['management-v11.js','calendar-v12.js','media-v13.js','match-v20.js','review-fixes-v20.js','awards-v21.js','v20.css','v21.css']){
 if(!html.includes(asset))issues.push(`${asset} ausente do index`);
 if(!sw.includes(asset))issues.push(`${asset} ausente do cache`);
}
const compat=read('www/v04-compat.js');if(compat.includes('__v04ClampGuard'))issues.push('monkey patch global de clamp ainda presente');
const fixes=read('www/review-fixes-v20.js');for(const marker of ['Sub-15','Sub-17','Sub-20','fanLimits','__v20Bundle','seasonRevenue'])if(!fixes.includes(marker))issues.push(`correção ausente: ${marker}`);
for(const file of ['management-v11.js','calendar-v12.js','media-v13.js','match-v20.js'])if(!read(`www/${file}`).includes('bindNavigationScope'))issues.push(`${file} sem escopo de navegação`);
if(issues.length)throw new Error(issues.join('\n'));
console.log(JSON.stringify({version:pkg.version,assets:8,status:'review-ok'}));
