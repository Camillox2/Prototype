import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=f=>fs.readFileSync(new URL(f,root),'utf8');
const pkg=JSON.parse(read('package.json')),html=read('www/index.html'),sw=read('www/sw.js'),career=read('www/offline-careers-v30.js'),start=read('www/offline-start-v30.js');
const issues=[];
if(Number(String(pkg.version).split('.')[0])<3)issues.push(`versão incompatível ${pkg.version}`);
for(const asset of ['offline-careers-v30.js','offline-start-v30.js','v30.css']){if(!html.includes(asset))issues.push(`${asset} ausente do HTML`);if(!sw.includes(asset))issues.push(`${asset} ausente do cache`);}
for(const marker of ["networkMode:'offline'",'unemployed','Manager completo','Diretor de futebol','Presidente','Proprietário','retire','switchClub','clubContexts'])if(!career.includes(marker))issues.push(`recurso offline ausente: ${marker}`);
for(const marker of ['removed:true','enabled:false','data-v05-view="women"'])if(!career.includes(marker)&&!start.includes(marker))issues.push(`remoção do feminino ausente: ${marker}`);
if(html.includes('Futebol feminino'))issues.push('atalho feminino permanece no HTML');
if(issues.length)throw new Error(issues.join('\n'));
console.log(JSON.stringify({status:'offline-career-ok',version:pkg.version,roles:5,women:false}));
