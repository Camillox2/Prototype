import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
const port=18787;
const child=spawn(process.execPath,['multiplayer/server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),FUTMASTER_ROOMS_FILE:'/tmp/futmaster-test-rooms.json'},stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(300);
function connect(){return new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}`);ws.once('open',()=>resolve(ws));ws.once('error',reject);});}
function request(ws,payload,type='session'){return new Promise((resolve,reject)=>{const requestId=Math.random().toString(36);const timer=setTimeout(()=>reject(new Error('timeout')),3500);const fn=raw=>{const msg=JSON.parse(raw);if(msg.requestId===requestId||(!msg.requestId&&msg.type===type)){if(msg.type==='error'){clearTimeout(timer);ws.off('message',fn);reject(new Error(msg.message));}else if(msg.type===type){clearTimeout(timer);ws.off('message',fn);resolve(msg);}}};ws.on('message',fn);ws.send(JSON.stringify({...payload,requestId}));});}
try{
 const host=await connect();
 const seed={main:{season:2026,week:1,userTeamId:'a',teams:[{id:'a'},{id:'b'}],finance:{balance:1}},modules:{}};
 const created=await request(host,{type:'create',name:'Teste',mode:'same-league',displayName:'Host',bundle:seed});
 assert.ok(created.session.roomCode); assert.equal(created.snapshot.bundle.main.userTeamId,'a');
 const friend=await connect(); const joined=await request(friend,{type:'join',roomCode:created.session.roomCode,displayName:'Amigo'});
 assert.ok(joined.session.token);
 const claim=await request(friend,{type:'claim-club',clubId:'b'},'snapshot'); assert.equal(claim.bundle.main.userTeamId,'b');
 host.close(); friend.close(); console.log(JSON.stringify({status:'multiplayer-server-ok',room:created.session.roomCode}));
} finally { child.kill('SIGTERM'); }
