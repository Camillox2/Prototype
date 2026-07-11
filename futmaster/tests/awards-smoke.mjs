import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const code=fs.readFileSync(new URL('www/awards-v21.js',root),'utf8');
const required=['Bola de Ouro','The Best FIFA – Melhor Jogador','Chuteira de Ouro Europeia','Prêmio Puskás','Troféu Yashin','Troféu Kopa','Troféu Gerd Müller','Rei da América','Melhor Jogador da Europa','Bola de Ouro da Copa do Mundo','Chuteira de Ouro da Copa do Mundo','Luva de Ouro da Copa do Mundo','FIFA Best XI'];
const missing=required.filter(x=>!code.includes(x));
if(missing.length)throw new Error(`Prêmios ausentes: ${missing.join(', ')}`);
for(const forbidden of ['Melhor Jogadora','Reina de América','Futebol feminino'])if(code.includes(forbidden))throw new Error(`Categoria feminina indevida: ${forbidden}`);
if(!code.includes('finalists')||!code.includes('records')||!code.includes('worldXI'))throw new Error('Histórico, finalistas ou seleção do ano ausentes');
console.log(JSON.stringify({status:'awards-ok',required:required.length}));
