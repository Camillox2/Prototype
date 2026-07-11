import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=f=>fs.readFileSync(new URL(f,root),'utf8'),issues=[];
const pkg=JSON.parse(read('package.json')),html=read('www/index.html'),sw=read('www/sw.js'),match=read('www/match-v33.js'),awards=read('www/awards-v33.js'),art=read('www/trophy-art-v33.js'),ai=read('www/automation-v33.js'),release=read('www/release-v33.js'),manifest=JSON.parse(read('www/manifest.webmanifest'));
if(pkg.version!=='3.3.0')issues.push(`versão ${pkg.version}`);
for(const f of ['trophy-art-v33.js','match-v33.js','awards-v33.js','automation-v33.js','release-v33.js','v33.css']){if(!html.includes(f))issues.push(`HTML sem ${f}`);if(!sw.includes(f))issues.push(`cache sem ${f}`);}
for(const m of ['pass','dribble','shot','save','celebration','camera','labels','trails','22 jogadores'])if(!match.includes(m))issues.push(`2D sem ${m}`);
for(const m of ['Bola de Ouro','The Best FIFA','Chuteira de Ouro','Copa do Mundo','Prêmio Puskás','Troféu Yashin','Rei da América'])if(!awards.includes(m))issues.push(`prêmio sem ${m}`);
for(const m of ['opponentAnalysis','contractPlanner','smartMarket','financialGuard','multiYear'])if(!ai.includes(m))issues.push(`IA sem ${m}`);
if(!release.includes('autoWomen:false')||!release.includes('removed:true'))issues.push('futebol feminino não neutralizado');
if((art.match(/\.png'/g)||[]).length<16||!art.includes('FMTrophyArt'))issues.push('artes de troféus insuficientes');
if(manifest.name!=='FutMaster 3.3'||!manifest.icons?.length)issues.push('manifesto/ícone');
if(issues.length)throw new Error(issues.join('\n'));
console.log(JSON.stringify({status:'v33-ok',trophyArt:16,version:pkg.version}));
