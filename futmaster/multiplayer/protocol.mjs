import crypto from 'node:crypto';

export const ROOM_MODES = Object.freeze({
  MULTI_LEAGUE: 'multi-league',
  SAME_LEAGUE: 'same-league',
  SHARED_CLUB: 'shared-club'
});

export const SECTORS = Object.freeze([
  'timeline','lineup','tactics','transfers','scouting','medical',
  'finance','stadium','commercial','fans','media','academy'
]);

const DEFAULT_PERMISSIONS = Object.freeze(Object.fromEntries(SECTORS.map(key => [key, true])));
const LIMITED_PERMISSIONS = Object.freeze(Object.fromEntries(SECTORS.map(key => [key, false])));

export function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomBytes(9).toString('base64url')}`;
}

export function roomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export function sessionToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function hashPassword(password = '', saltHex = crypto.randomBytes(16).toString('hex')) {
  if (!password) return '';
  const salt = Buffer.from(saltHex, 'hex');
  const derived = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${saltHex}$${derived.toString('hex')}`;
}

function verifyPasswordHash(stored, password = '') {
  if (!stored) return true;
  if (!stored.startsWith('scrypt$')) {
    const legacy = crypto.createHash('sha256').update(String(password)).digest('hex');
    return stored === legacy;
  }
  const [,saltHex,expectedHex] = stored.split('$');
  if (!saltHex || !expectedHex) return false;
  const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), 32);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function safeText(value, max = 60) {
  return String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
}

export function clone(value) {
  return value == null ? value : structuredClone(value);
}

function normalizeContext(bundle = {}) {
  const main = clone(bundle.main || {});
  const clubId = main.userTeamId || null;
  const context = clubId ? {
    finance: main.finance || null,
    fans: main.fans || null,
    stadium: main.stadium || null,
    commercial: main.commercial || null,
    facilities: main.facilities || null,
    board: main.board || null,
    departments: main.departments || null,
    automation: main.automation || null
  } : null;
  for (const key of ['finance','fans','stadium','commercial','facilities','board','departments','automation']) delete main[key];
  return {main, clubId, context, modules: clone(bundle.modules || {})};
}

export function createRoom({
  name = 'Sala FutMaster', mode = ROOM_MODES.SAME_LEAGUE, hostName = 'Host',
  passwordHash = '', maxPlayers = 8, bundle = {}, serverVersion = '3.2.0'
} = {}) {
  if (!Object.values(ROOM_MODES).includes(mode)) throw new Error('Modo de sala inválido.');
  const normalized = normalizeContext(bundle);
  const memberId = uid('member');
  const token = sessionToken();
  const now = Date.now();
  const room = {
    id: uid('room'), code: roomCode(), name: safeText(name, 45) || 'Sala FutMaster', mode,
    passwordHash, maxPlayers: Math.max(2, Math.min(16, Number(maxPlayers) || 8)),
    serverVersion, revision: 0, createdAt: now, updatedAt: now, hostMemberId: memberId,
    sharedClubId: mode === ROOM_MODES.SHARED_CLUB ? normalized.clubId : null,
    universe: {main: normalized.main, modules: normalized.modules},
    clubContexts: normalized.clubId && normalized.context ? {[normalized.clubId]: normalized.context} : {},
    members: [{id: memberId, name: safeText(hostName, 28) || 'Host', token, role: 'host',
      clubId: normalized.clubId, online: true, joinedAt: now, lastSeen: now,
      permissions: {...DEFAULT_PERMISSIONS}}],
    ready: {[memberId]: false}, chat: [], audit: [], locks: {}, lastAdvance: null
  };
  audit(room, memberId, 'room-created', `${room.name} criada em ${mode}.`);
  return {room, member: clone(room.members[0])};
}

export function verifyPassword(room, password = '') {
  return verifyPasswordHash(room.passwordHash, password);
}

export function memberById(room, memberId) {
  return room.members.find(member => member.id === memberId) || null;
}

export function memberByToken(room, token) {
  return room.members.find(member => member.token === token) || null;
}

export function joinRoom(room, {displayName = 'Jogador', password = '', requestedClubId = null} = {}) {
  if (!verifyPassword(room, password)) throw new Error('Senha incorreta.');
  if (room.members.length >= room.maxPlayers) throw new Error('Sala lotada.');
  const now = Date.now(), id = uid('member'), token = sessionToken();
  const member = {id, name: safeText(displayName, 28) || 'Jogador', token, role: 'player', clubId: null,
    online: true, joinedAt: now, lastSeen: now, permissions: {...(room.mode === ROOM_MODES.SHARED_CLUB ? LIMITED_PERMISSIONS : DEFAULT_PERMISSIONS)}};
  room.members.push(member); room.ready[id] = false;
  if (room.mode === ROOM_MODES.SHARED_CLUB && room.sharedClubId) member.clubId = room.sharedClubId;
  else if (requestedClubId) claimClub(room, id, requestedClubId);
  touch(room); audit(room, id, 'member-joined', `${member.name} entrou na sala.`);
  return clone(member);
}

export function resumeMember(room, token) {
  const member = memberByToken(room, token);
  if (!member) throw new Error('Sessão não encontrada.');
  member.online = true; member.lastSeen = Date.now(); touch(room);
  return clone(member);
}

export function leaveMember(room, memberId, permanent = false) {
  const member = memberById(room, memberId); if (!member) return;
  if (permanent) {
    room.members = room.members.filter(x => x.id !== memberId);
    delete room.ready[memberId];
    if (room.hostMemberId === memberId && room.members.length) {
      room.hostMemberId = room.members[0].id; room.members[0].role = 'host';
      room.members[0].permissions = {...DEFAULT_PERMISSIONS};
    }
  } else { member.online = false; member.lastSeen = Date.now(); }
  touch(room); audit(room, memberId, permanent ? 'member-left' : 'member-offline', member.name);
}

export function claimClub(room, memberId, clubId) {
  const member = memberById(room, memberId); if (!member) throw new Error('Membro inexistente.');
  const cleanClub = safeText(clubId, 90); if (!cleanClub) throw new Error('Clube inválido.');
  if (room.mode === ROOM_MODES.SHARED_CLUB) {
    if (room.sharedClubId && room.sharedClubId !== cleanClub) throw new Error('Esta sala compartilha outro clube.');
    room.sharedClubId = cleanClub;
    room.members.forEach(x => { x.clubId = cleanClub; });
  } else {
    const occupied = room.members.some(x => x.id !== memberId && x.clubId === cleanClub);
    if (occupied) throw new Error('Clube já controlado por outro jogador.');
    member.clubId = cleanClub;
  }
  room.ready[memberId] = false; touch(room); audit(room, memberId, 'club-claimed', cleanClub);
  return clone(member);
}

export function setMemberPermissions(room, actorId, targetId, permissions = {}) {
  if (actorId !== room.hostMemberId) throw new Error('Somente o host altera permissões.');
  const target = memberById(room, targetId); if (!target) throw new Error('Membro inexistente.');
  const next = {...LIMITED_PERMISSIONS};
  SECTORS.forEach(key => { if (Object.hasOwn(permissions, key)) next[key] = Boolean(permissions[key]); });
  if (target.id === room.hostMemberId) Object.assign(next, DEFAULT_PERMISSIONS);
  target.permissions = next; touch(room); audit(room, actorId, 'permissions', target.name);
  return clone(target.permissions);
}

export function can(room, memberId, sector) {
  const member = memberById(room, memberId);
  if (!member || !SECTORS.includes(sector)) return false;
  return member.id === room.hostMemberId || Boolean(member.permissions?.[sector]);
}

export function setReady(room, memberId, value = true) {
  if (!memberById(room, memberId)) throw new Error('Membro inexistente.');
  room.ready[memberId] = Boolean(value); touch(room);
  return allReady(room);
}

export function allReady(room) {
  const active = room.members.filter(member => member.online && member.clubId);
  return active.length > 0 && active.every(member => room.ready[member.id]);
}

export function canAdvance(room, memberId) {
  return memberId === room.hostMemberId && (allReady(room) || room.members.filter(m => m.online && m.clubId).length <= 1);
}

function mergeObject(target, patch, depth = 0) {
  if (depth > 8 || patch == null || typeof patch !== 'object' || Array.isArray(patch)) return clone(patch);
  const out = target && typeof target === 'object' && !Array.isArray(target) ? {...target} : {};
  for (const [key, value] of Object.entries(patch)) {
    if (['__proto__','prototype','constructor'].includes(key)) continue;
    out[key] = value && typeof value === 'object' && !Array.isArray(value) ? mergeObject(out[key], value, depth + 1) : clone(value);
  }
  return out;
}

export function publishState(room, {memberId, revision, bundle, sector = 'timeline'} = {}) {
  const member = memberById(room, memberId); if (!member) throw new Error('Membro inexistente.');
  if (Number(revision) !== room.revision) throw Object.assign(new Error('Revisão desatualizada.'), {code:'STALE_REVISION'});
  if (!can(room, memberId, sector)) throw new Error(`Sem permissão para ${sector}.`);
  const normalized = normalizeContext(bundle);
  if (normalized.clubId && member.clubId && normalized.clubId !== member.clubId) throw new Error('Estado enviado para clube não autorizado.');
  room.universe.main = mergeObject(room.universe.main, normalized.main);
  room.universe.modules = mergeObject(room.universe.modules, normalized.modules);
  if (member.clubId && normalized.context) room.clubContexts[member.clubId] = mergeObject(room.clubContexts[member.clubId], normalized.context);
  room.revision += 1; room.updatedAt = Date.now(); room.lastAdvance = sector === 'timeline' ? {memberId, at:Date.now(), revision:room.revision} : room.lastAdvance;
  Object.keys(room.ready).forEach(id => { room.ready[id] = false; });
  audit(room, memberId, 'state-published', `${sector}@${room.revision}`);
  return room.revision;
}

export function snapshotFor(room, memberId) {
  const member = memberById(room, memberId); if (!member) throw new Error('Membro inexistente.');
  const main = clone(room.universe.main || {});
  const clubId = room.mode === ROOM_MODES.SHARED_CLUB ? room.sharedClubId : member.clubId;
  if (clubId) {
    main.userTeamId = clubId;
    Object.assign(main, clone(room.clubContexts[clubId] || {}));
  }
  return {room: publicRoom(room), revision: room.revision, bundle:{main, modules:clone(room.universe.modules || {})}};
}

export function addChat(room, memberId, text) {
  const member = memberById(room, memberId); if (!member) throw new Error('Membro inexistente.');
  const message = {id:uid('chat'), memberId, name:member.name, text:safeText(text, 350), at:Date.now()};
  if (!message.text) throw new Error('Mensagem vazia.');
  room.chat.push(message); room.chat = room.chat.slice(-150); touch(room); return clone(message);
}

export function publicRoom(room) {
  return {
    id:room.id, code:room.code, name:room.name, mode:room.mode, maxPlayers:room.maxPlayers,
    revision:room.revision, hostMemberId:room.hostMemberId, sharedClubId:room.sharedClubId,
    members:room.members.map(({token,...member}) => clone(member)), ready:clone(room.ready),
    chat:clone(room.chat.slice(-80)), updatedAt:room.updatedAt
  };
}

export function audit(room, memberId, action, detail='') {
  room.audit.push({id:uid('audit'), memberId, action, detail:safeText(detail,160), at:Date.now()});
  room.audit = room.audit.slice(-300);
}

export function touch(room) { room.updatedAt = Date.now(); }
