import assert from 'node:assert/strict';
import {ROOM_MODES, createRoom, joinRoom, claimClub, setMemberPermissions, can, setReady, canAdvance, publishState, snapshotFor, hashPassword} from '../multiplayer/protocol.mjs';

const seed={main:{season:2026,week:1,userTeamId:'club-a',teams:[{id:'club-a'},{id:'club-b'},{id:'club-c'}],finance:{balance:10},fans:{satisfaction:70}},modules:{world:{round:1}}};
const {room,member:host}=createRoom({mode:ROOM_MODES.SAME_LEAGUE,hostName:'Vitor',bundle:seed,passwordHash:hashPassword('123')});
assert.equal(room.members.length,1); assert.equal(host.clubId,'club-a');
const friend=joinRoom(room,{displayName:'Luiz',password:'123'}); claimClub(room,friend.id,'club-b');
assert.throws(()=>joinRoom(room,{displayName:'X',password:'wrong'}));
const third=joinRoom(room,{displayName:'Ana',password:'123'}); assert.throws(()=>claimClub(room,third.id,'club-b'));
claimClub(room,third.id,'club-c'); setReady(room,host.id,true); setReady(room,friend.id,true); setReady(room,third.id,false); assert.equal(canAdvance(room,host.id),false);
setReady(room,third.id,true); assert.equal(canAdvance(room,host.id),true);
const rev=publishState(room,{memberId:host.id,revision:0,sector:'timeline',bundle:{main:{...seed.main,week:2},modules:seed.modules}}); assert.equal(rev,1);
assert.throws(()=>publishState(room,{memberId:friend.id,revision:0,sector:'timeline',bundle:seed}),/desatualizada/);
const snap=snapshotFor(room,friend.id); assert.equal(snap.bundle.main.userTeamId,'club-b'); assert.equal(snap.bundle.main.week,2);

const shared=createRoom({mode:ROOM_MODES.SHARED_CLUB,bundle:seed}).room;
const mate=joinRoom(shared,{displayName:'Co-manager'}); assert.equal(mate.clubId,'club-a');
setMemberPermissions(shared,shared.hostMemberId,mate.id,{tactics:true,transfers:false});
assert.equal(can(shared,mate.id,'tactics'),true); assert.equal(can(shared,mate.id,'transfers'),false);
assert.throws(()=>publishState(shared,{memberId:mate.id,revision:0,sector:'transfers',bundle:seed}),/permissão/);
console.log(JSON.stringify({status:'multiplayer-protocol-ok',modes:Object.values(ROOM_MODES).length,members:room.members.length}));
