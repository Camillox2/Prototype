import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const pkg=JSON.parse(fs.readFileSync(new URL('package.json',root),'utf8'));
if(pkg.version!=='1.0.0')throw new Error(`Versão esperada 1.0.0, encontrada ${pkg.version}`);
const html=fs.readFileSync(new URL('www/index.html',root),'utf8');
const sw=fs.readFileSync(new URL('www/sw.js',root),'utf8');
const assets=['release-core-v10.js','release-ui-v10.js','social-local-v10.js','v10.css','football-depth-v09.js','world-pyramid-v08.js','career-market-v07.js','stability-v06.js'];
for(const asset of assets){if(!html.includes(asset))throw new Error(`${asset} ausente do index`);if(!sw.includes(asset))throw new Error(`${asset} ausente do cache offline`);}
const core=fs.readFileSync(new URL('www/release-core-v10.js',root),'utf8');
const ui=fs.readFileSync(new URL('www/release-ui-v10.js',root),'utf8');
const social=fs.readFileSync(new URL('www/social-local-v10.js',root),'utf8');
for(const marker of ['futmaster-mod','createClub','ACHIEVEMENTS','exportFull'])if(!core.includes(marker))throw new Error(`Recurso ausente no núcleo: ${marker}`);
for(const marker of ['Central de mensagens','Criar novo clube','Desafios','Aparência e acessibilidade'])if(!ui.includes(marker))throw new Error(`Tela ausente: ${marker}`);
for(const marker of ['Rede social','futmaster-brasfoot-pack','indexedDB','Criar liga com os 10 melhores'])if(!social.includes(marker))throw new Error(`Integração privada ausente: ${marker}`);
console.log(JSON.stringify({version:pkg.version,assets:assets.length,status:'ok'}));
