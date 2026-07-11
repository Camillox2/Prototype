(function(global){
'use strict';
const C=global.FMCore, Systems=global.FMSystems;
const MAIN='futmaster-save-v4', KEY='futmaster-release-v10';
const CHALLENGES=[
{id:'road',name:'Da base ao topo',text:'Conquiste uma promoção.',reward:250000},
{id:'youth',name:'Geração de ouro',text:'Tenha três atletas sub-21 com cinco jogos.',reward:180000},
{id:'rescue',name:'Clube sustentável',text:'Mantenha caixa positivo e folha dentro do orçamento.',reward:150000},
{id:'giant',name:'Derruba-gigantes',text:'Vença um rival 12 pontos mais forte.',reward:220000},
{id:'empire',name:'Grupo internacional',text:'Adquira dois clubes subsidiários.',reward:350000}
];
const ACHIEVEMENTS=[
{id:'first-win',name:'Primeira vitória',text:'Vença uma partida.'},
{id:'ten-wins',name:'Dez vitórias',text:'Some dez vitórias.'},
{id:'hundred',name:'Centenário',text:'Dispute cem partidas.'},
{id:'champion',name:'Campeão',text:'Conquiste um título.'},
{id:'invincible',name:'Inabalável',text:'Fique cinco jogos sem perder.'},
{id:'academy',name:'Orgulho da base',text:'Um sub-21 complete dez jogos.'},
{id:'rich',name:'Gestão milionária',text:'Alcance R$ 50 milhões em caixa.'},
{id:'full-house',name:'Casa cheia',text:'Supere 95% de ocupação.'},
{id:'world',name:'Campeão do mundo',text:'Ganhe o Mundial de Seleções.'},
{id:'owner',name:'Dono da bola',text:'Compre um clube.'},
{id:'pro-license',name:'Licença máxima',text:'Conclua a Licença Pro.'},
{id:'developer',name:'Construtor de mundos',text:'Use um mod local.'}
];
const TUTORIAL=[
{id:'career',title:'Criar carreira',text:'Escolha ou crie um clube.'},
{id:'lineup',title:'Definir escalação',text:'Escale os titulares.'},
{id:'automation',title:'Configurar automação',text:'Escolha o controle geral e por setor.'},
{id:'match',title:'Jogar uma partida',text:'Avance uma semana.'},
{id:'scouting',title:'Enviar olheiro',text:'Abra Scouting mundial.'},
{id:'save',title:'Criar backup',text:'Grave um slot na Central de saves.'}
];
function get(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}}
function set(k,v){localStorage.setItem(k,JSON.stringify(v));}
function state(){return get(MAIN);}
function save(s){localStorage.setItem(MAIN,JSON.stringify(s));}
function team(s){return s.teams.find(t=>t.id===s.userTeamId);}
function signature(s){return `${s.managerName}|${s.teams?.[0]?.squad?.[0]?.id||'new'}`;}
function createData(s){return {version:10,signature:signature(s),tutorial:[],challenges:Object.fromEntries(CHALLENGES.map(x=>[x.id,{active:false,done:false}])),achievements:{},read:[],mods:[],messages:[],settings:{theme:'dark',font:100,density:'comfortable',contrast:false,motion:true},stats:{exports:0,imports:0,clubs:0}};}
function data(s){let d=get(KEY);if(!d||d.version!==10||d.signature!==signature(s)){d=createData(s);set(KEY,d);}return d;}
function notify(d,s,category,text){d.messages.unshift({id:C.uid('v10'),season:s.season,week:s.week,category,text});d.messages=d.messages.slice(0,150);}
function money(v){return C.money(Number(v)||0);}
function reward(s,d,name,value){s.finance.balance+=value;s.finance.seasonRevenue=(s.finance.seasonRevenue||0)+value;s.finance.cashFlow.unshift({season:s.season,week:s.week,type:'Receita',category:'Desafio',amount:value,description:name});notify(d,s,'Desafio',`${name} concluído: ${money(value)}.`);}
function unlock(d,s,id){if(d.achievements[id])return;const a=ACHIEVEMENTS.find(x=>x.id===id);if(!a)return;d.achievements[id]={season:s.season,week:s.week};notify(d,s,'Conquista',`${a.name} foi desbloqueada.`);}
function matches(s){return (s.matchHistory||[]).filter(m=>m.homeId===s.userTeamId||m.awayId===s.userTeamId);}
function assess(s,d){
const t=team(s),list=matches(s),wins=list.filter(m=>m.homeId===s.userTeamId?m.homeGoals>m.awayGoals:m.awayGoals>m.homeGoals);
if(wins.length)unlock(d,s,'first-win'); if((t.wins||0)>=10||wins.length>=10)unlock(d,s,'ten-wins');
if((t.played||0)>=100)unlock(d,s,'hundred'); if((s.records?.titles||0)>0)unlock(d,s,'champion');
if((t.formSequence||[]).length>=5&&!t.formSequence.slice(-5).includes('D'))unlock(d,s,'invincible');
if(t.squad.some(p=>p.age<=21&&p.appearances>=10))unlock(d,s,'academy'); if(s.finance.balance>=50000000)unlock(d,s,'rich');
if((s.stadium.lastMatchOperations?.occupancy||0)>=95)unlock(d,s,'full-house');
const u=get('futmaster-universe-v05'),i=get('futmaster-international-v04'),m=get('futmaster-market-v07'),w=get('futmaster-world-v08');
if(u?.worldCup?.champion&&i?.national?.job?.teamId===u.worldCup.champion)unlock(d,s,'world');
if((i?.group?.owned||[]).length)unlock(d,s,'owner'); if(m?.manager?.license==='pro')unlock(d,s,'pro-license');
for(const c of CHALLENGES){const x=d.challenges[c.id];if(!x.active||x.done)continue;let ok=false;
if(c.id==='road')ok=(w?.user?.history||[]).some(h=>h.movement==='Promoção');
if(c.id==='youth')ok=t.squad.filter(p=>p.age<=21&&p.appearances>=5).length>=3;
if(c.id==='rescue')ok=s.finance.balance>0&&Systems.squadWages(t)<=s.finance.wageBudget;
if(c.id==='giant')ok=list.some(g=>{const won=g.homeId===s.userTeamId?g.homeGoals>g.awayGoals:g.awayGoals>g.homeGoals;const own=g.homeId===s.userTeamId?g.performance?.homeOverall:g.performance?.awayOverall;const opp=g.homeId===s.userTeamId?g.performance?.awayOverall:g.performance?.homeOverall;return won&&Number.isFinite(own)&&Number.isFinite(opp)&&opp-own>=12;});
if(c.id==='empire')ok=(i?.group?.owned||[]).length>=2;
if(ok){x.done=true;x.at=new Date().toISOString();reward(s,d,c.name,c.reward);}}
const done=d.tutorial;if(s.userTeamId&&!done.includes('career'))done.push('career');if(t.squad.some(p=>p.starter)&&!done.includes('lineup'))done.push('lineup');if(s.automation&&!done.includes('automation'))done.push('automation');if(list.length&&!done.includes('match'))done.push('match');if((m?.scouting?.assignments||[]).length&&!done.includes('scouting'))done.push('scouting');if((get('futmaster-v06-meta')?.slots||[]).some(Boolean)&&!done.includes('save'))done.push('save');
}
function createClub(s,d,f){const name=f.name.trim(),short=f.short.trim().toUpperCase().slice(0,3),city=f.city.trim();if(name.length<3||short.length<2||city.length<2)throw new Error('Nome, sigla ou cidade inválidos.');const strength=C.clamp(Number(f.strength)||58,45,82),budget=C.clamp(Number(f.budget)||5000000,500000,100000000),capacity=C.clamp(Number(f.capacity)||12000,3000,80000);const club=C.createTeam({id:`custom-${Date.now().toString(36)}`,name,short,city,strength,budget,capacity,reputation:C.clamp(strength-6,35,86)},C.randomInt(1200,9000));club.custom=true;club.philosophy=f.philosophy;club.colors=[f.primary,f.secondary];const idx=s.teams.findIndex(x=>x.id===s.userTeamId);if(idx>=0)s.teams.splice(idx,1,club);else s.teams.unshift(club);s.userTeamId=club.id;s.fixtures=C.roundRobin(s.teams.map(x=>x.id));s.round=0;s.week=1;s.matchHistory=[];s.finance=Systems.createFinance(club);s.fans=Systems.createFanSystem(club);s.stadium=Systems.createStadium(club);s.commercial=Systems.createCommercial(club);s.facilities=Systems.createFacilities();s.board={confidence:72,objectives:Systems.createBoardObjectives(club),messages:[]};s.departments=Systems.createDepartments();s.staffMarket=Systems.generateStaffMarket(s.season);s.automation={mode:'manual',autoHire:true};d.stats.clubs++;notify(d,s,'Clube',`${name} foi fundado em ${city}.`);}
function editClub(s,d,f){const t=team(s);t.name=f.name.trim()||t.name;t.short=(f.short.trim()||t.short).toUpperCase().slice(0,3);t.city=f.city.trim()||t.city;t.philosophy=f.philosophy;t.colors=[f.primary,f.secondary];s.stadium.name=f.stadium.trim()||s.stadium.name;notify(d,s,'Editor',`Dados do ${t.name} foram atualizados.`);}
function addPlayer(s,d,f){const t=team(s),p=C.createPlayer(C.randomInt(10000,99999),t.squad.length,{clubLevel:C.clamp(Number(f.overall)||55,35,90),position:f.position,age:C.clamp(Number(f.age)||20,14,38),nationality:f.nationality.trim()||'Brasil'});p.name=f.name.trim()||p.name;p.potential=C.clamp(Number(f.potential)||p.potential,p.overall,99);p.value=C.valueFromPlayer(p.overall,p.potential,p.age);p.custom=true;t.squad.push(p);notify(d,s,'Editor',`${p.name} foi criado.`);}
function download(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);}
function modPackage(s){const t=team(s);return {format:'futmaster-mod',version:1,club:{name:t.name,short:t.short,city:t.city,strength:C.calculateTeamOverall(t),budget:s.finance.balance,capacity:s.stadium.capacity,reputation:t.reputation,colors:t.colors,philosophy:t.philosophy},players:t.squad.filter(p=>p.custom).map(p=>({name:p.name,position:p.position,age:p.age,nationality:p.nationality,overall:p.overall,potential:p.potential}))};}
function exportMod(s,d){download(modPackage(s),`futmaster-mod-${team(s).short}.json`);d.stats.exports++;d.mods.unshift({type:'export',name:team(s).name,at:new Date().toISOString()});unlock(d,s,'developer');}
function importMod(s,d,file,done){const r=new FileReader();r.onload=()=>{try{const mod=JSON.parse(r.result);if(mod?.format!=='futmaster-mod'||mod?.version!==1||!mod?.club?.name)throw new Error('Pacote inválido.');const x=mod.club,club=C.createTeam({id:`mod-${Date.now().toString(36)}`,name:x.name,short:String(x.short||'MOD').toUpperCase().slice(0,3),city:x.city||'Cidade personalizada',strength:C.clamp(Number(x.strength)||60,35,92),budget:Number(x.budget)||5000000,capacity:Number(x.capacity)||12000,reputation:C.clamp(Number(x.reputation)||55,30,95)},C.randomInt(2000,9000));club.colors=x.colors;club.philosophy=x.philosophy;for(const input of mod.players||[]){const p=C.createPlayer(C.randomInt(10000,99999),club.squad.length,{clubLevel:C.clamp(Number(input.overall)||55,35,92),position:input.position||'MC',age:C.clamp(Number(input.age)||20,14,38),nationality:input.nationality||'Brasil'});p.name=input.name||p.name;p.potential=C.clamp(Number(input.potential)||p.potential,p.overall,99);p.custom=true;club.squad.push(p);}s.teams.push(club);s.fixtures=C.roundRobin(s.teams.map(t=>t.id));d.stats.imports++;d.mods.unshift({type:'import',name:club.name,at:new Date().toISOString()});unlock(d,s,'developer');notify(d,s,'Mod',`${club.name} foi importado.`);save(s);set(KEY,d);done?.();}catch(e){alert(e.message);}};r.readAsText(file);}
function exportFull(){const keys={};Object.keys(localStorage).filter(k=>k.startsWith('futmaster-')).forEach(k=>keys[k]=localStorage.getItem(k));download({format:'futmaster-full',version:10,keys},`futmaster-1.0-backup-${Date.now()}.json`);}
function inbox(s,d){const out=[...d.messages],push=(cat,list,text)=>{(list||[]).forEach((x,n)=>out.push({id:`${cat}-${x.id||x.season||n}-${x.week||n}`,season:x.season||s.season,week:x.week||0,category:cat,text:text(x)}));};push('Clube',s.news,x=>x.text);const m=get('futmaster-market-v07'),u=get('futmaster-universe-v05'),i=get('futmaster-international-v04'),w=get('futmaster-world-v08');push('Mercado',m?.market?.news,x=>x.text);push('Universo',u?.events,x=>x.text);push('Imprensa',u?.media?.history,x=>`${x.answer}: ${x.result}`);push('Internacional',i?.notifications,x=>x.text);push('Mundo',w?.events,x=>x.text);return out.sort((a,b)=>(b.season-a.season)||(b.week-a.week)).slice(0,180);}
function players(s){return s.teams.flatMap(t=>t.squad.map(p=>({...p,clubName:t.name,clubId:t.id})));}
function applySettings(d){document.documentElement.dataset.gameTheme=d.settings.theme;document.documentElement.dataset.density=d.settings.density;document.documentElement.style.fontSize=`${d.settings.font}%`;document.documentElement.classList.toggle('high-contrast',d.settings.contrast);document.documentElement.classList.toggle('reduced-motion',!d.settings.motion);}
global.FMRelease10={KEY,CHALLENGES,ACHIEVEMENTS,TUTORIAL,get,set,state,save,team,data,notify,assess,createClub,editClub,addPlayer,exportMod,importMod,exportFull,inbox,players,applySettings,money};
})(window);