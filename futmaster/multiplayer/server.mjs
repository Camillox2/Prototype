import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {WebSocketServer, WebSocket} from 'ws';
import {
  createRoom, joinRoom, resumeMember, leaveMember, claimClub, setMemberPermissions,
  setReady, publishState, snapshotFor, addChat, publicRoom, hashPassword, memberById
} from './protocol.mjs';

const PORT = Math.max(1, Number(process.env.PORT || 8787));
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = path.resolve(process.env.FUTMASTER_ROOMS_FILE || './multiplayer/data/rooms.json');
const MAX_PAYLOAD = Math.max(1024 * 128, Number(process.env.FUTMASTER_MAX_PAYLOAD || 12 * 1024 * 1024));
const ORIGINS = String(process.env.FUTMASTER_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
const rooms = new Map();
const sockets = new Map();
let saveTimer = null;

function loadRooms() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    for (const room of parsed.rooms || []) rooms.set(room.code, room);
    console.log(`[FutMaster] ${rooms.size} sala(s) restaurada(s).`);
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('[FutMaster] Não foi possível restaurar salas:', error.message);
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), {recursive:true});
    const temporary = `${DATA_FILE}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({version:1,savedAt:Date.now(),rooms:[...rooms.values()]}, null, 2));
    fs.renameSync(temporary, DATA_FILE);
  }, 120);
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function fail(ws, message, code = 'BAD_REQUEST', requestId = null) {
  send(ws, {type:'error', code, message:String(message || 'Erro desconhecido.'), requestId});
}

function broadcast(room, payload, except = null) {
  for (const [ws, session] of sockets) {
    if (ws !== except && session.roomCode === room.code) send(ws, payload);
  }
}

function pushRoom(room) {
  broadcast(room, {type:'room', room:publicRoom(room)});
}

function identify(ws) {
  const session = sockets.get(ws);
  if (!session) throw new Error('Conecte-se a uma sala primeiro.');
  const room = rooms.get(session.roomCode);
  if (!room) throw new Error('Sala não encontrada.');
  const member = memberById(room, session.memberId);
  if (!member) throw new Error('Membro não encontrado.');
  return {session, room, member};
}

function rateLimit(session) {
  const now = Date.now();
  session.window = session.window || {at:now,count:0};
  if (now - session.window.at > 10_000) session.window = {at:now,count:0};
  session.window.count += 1;
  if (session.window.count > 100) throw new Error('Muitas ações em pouco tempo.');
}

async function handle(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw.toString()); }
  catch { return fail(ws, 'Mensagem JSON inválida.', 'INVALID_JSON'); }
  const requestId = msg.requestId || null;
  try {
    const existing = sockets.get(ws); if (existing) rateLimit(existing);
    if (msg.type === 'create') {
      const created = createRoom({name:msg.name, mode:msg.mode, hostName:msg.displayName,
        passwordHash:hashPassword(msg.password), maxPlayers:msg.maxPlayers, bundle:msg.bundle});
      while (rooms.has(created.room.code)) created.room.code = created.room.code.slice(0,6) + Math.floor(Math.random()*90+10);
      rooms.set(created.room.code, created.room);
      sockets.set(ws, {roomCode:created.room.code,memberId:created.member.id,token:created.member.token});
      send(ws, {type:'session', requestId, session:{roomCode:created.room.code,memberId:created.member.id,token:created.member.token}, snapshot:snapshotFor(created.room,created.member.id)});
      scheduleSave(); pushRoom(created.room); return;
    }
    if (msg.type === 'join') {
      const room = rooms.get(String(msg.roomCode || '').toUpperCase()); if (!room) throw new Error('Sala não encontrada.');
      const member = joinRoom(room,{displayName:msg.displayName,password:msg.password,requestedClubId:msg.clubId});
      sockets.set(ws,{roomCode:room.code,memberId:member.id,token:member.token});
      send(ws,{type:'session',requestId,session:{roomCode:room.code,memberId:member.id,token:member.token},snapshot:snapshotFor(room,member.id)});
      scheduleSave(); pushRoom(room); return;
    }
    if (msg.type === 'resume') {
      const room = rooms.get(String(msg.roomCode || '').toUpperCase()); if (!room) throw new Error('Sala não encontrada.');
      const member = resumeMember(room,msg.token);
      sockets.set(ws,{roomCode:room.code,memberId:member.id,token:member.token});
      send(ws,{type:'session',requestId,session:{roomCode:room.code,memberId:member.id,token:member.token},snapshot:snapshotFor(room,member.id)});
      scheduleSave(); pushRoom(room); return;
    }
    const {room,member} = identify(ws);
    if (msg.type === 'sync') send(ws,{type:'snapshot',requestId,...snapshotFor(room,member.id)});
    else if (msg.type === 'claim-club') { claimClub(room,member.id,msg.clubId); scheduleSave(); send(ws,{type:'snapshot',...snapshotFor(room,member.id)}); pushRoom(room); }
    else if (msg.type === 'permissions') { setMemberPermissions(room,member.id,msg.targetId,msg.permissions); scheduleSave(); pushRoom(room); }
    else if (msg.type === 'ready') { const all=setReady(room,member.id,msg.ready); scheduleSave(); broadcast(room,{type:'ready',memberId:member.id,ready:Boolean(msg.ready),allReady:all,room:publicRoom(room)}); }
    else if (msg.type === 'publish') {
      const revision=publishState(room,{memberId:member.id,revision:msg.revision,bundle:msg.bundle,sector:msg.sector||'timeline'});
      scheduleSave();
      send(ws,{type:'published',requestId,revision});
      for (const [peer,session] of sockets) if (session.roomCode===room.code && peer!==ws) send(peer,{type:'snapshot',...snapshotFor(room,session.memberId)});
      pushRoom(room);
    }
    else if (msg.type === 'chat') { const chat=addChat(room,member.id,msg.text); scheduleSave(); broadcast(room,{type:'chat',message:chat}); }
    else if (msg.type === 'leave') { leaveMember(room,member.id,true); sockets.delete(ws); scheduleSave(); pushRoom(room); send(ws,{type:'left'}); }
    else throw new Error('Ação desconhecida.');
  } catch (failure) {
    fail(ws,failure.message,failure.code || 'BAD_REQUEST',requestId);
    if (failure.code === 'STALE_REVISION') {
      try { const {room,member}=identify(ws); send(ws,{type:'snapshot',...snapshotFor(room,member.id)}); } catch {}
    }
  }
}

loadRooms();
const server = http.createServer((req,res) => {
  if (req.url === '/health') {
    res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':'*'});
    return res.end(JSON.stringify({ok:true,service:'futmaster-multiplayer',rooms:rooms.size,version:'3.1.0'}));
  }
  res.writeHead(200,{'content-type':'text/plain; charset=utf-8'});
  res.end('FutMaster Multiplayer 3.1\n');
});
const wss = new WebSocketServer({server,maxPayload:MAX_PAYLOAD,verifyClient:({origin})=>!ORIGINS.length||ORIGINS.includes(origin)});
wss.on('connection',ws=>{
  ws.isAlive=true; ws.on('pong',()=>{ws.isAlive=true;});
  ws.on('message',raw=>handle(ws,raw));
  ws.on('close',()=>{const session=sockets.get(ws);sockets.delete(ws);if(session){const room=rooms.get(session.roomCode);if(room){leaveMember(room,session.memberId,false);scheduleSave();pushRoom(room);}}});
  send(ws,{type:'hello',version:'3.1.0'});
});
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(ws.isAlive===false){ws.terminate();continue;}ws.isAlive=false;ws.ping();}},30_000);
wss.on('close',()=>clearInterval(heartbeat));
server.listen(PORT,HOST,()=>console.log(`[FutMaster] Multiplayer em ws://${HOST}:${PORT}`));

function shutdown(){clearInterval(heartbeat);for(const ws of wss.clients)ws.close(1001,'Servidor encerrado');server.close(()=>process.exit(0));}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
