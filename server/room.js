// room.js
// Estado de sala preparado para 2–10 jugadores.
// El juego actual es "carrera" (posición por jugador) y turnos.

export function createRoom(roomId) {
  return {
    id: roomId,
    createdAt: Date.now(),
    players: new Map(), // socketId -> { id, name, pos, isHost }
    order: [],          // socketId[] (orden de turnos)
    turnIndex: 0,
    config: {
      mode: "colorroll",   // "colorroll" | "probalico"
      circles: 20
    },
    probalico: {
      giftStacks: 0,
      probsBp: [1667, 1667, 1667, 1667, 1666, 1666] // suma 10000
    },
    started: false
  };
}

export function roomSnapshot(room) {
  const players = room.order.map((sid) => {
    const p = room.players.get(sid);
    return p ? { id: p.id, name: p.name, pos: p.pos, isHost: p.isHost } : null;
  }).filter(Boolean);

  return {
    id: room.id,
    createdAt: room.createdAt,
    started: room.started,
    config: room.config,
    turnSocketId: room.order[room.turnIndex] ?? null,
    players,
    probalico: room.config.mode === "probalico"
      ? { giftStacks: room.probalico.giftStacks, probsBp: room.probalico.probsBp }
      : null
  };
}

export function normalizeBpTo10000(bpArr) {
  const sum = bpArr.reduce((a, b) => a + b, 0);
  if (sum === 10000) return bpArr;
  const diff = 10000 - sum;
  bpArr[0] = Math.max(0, bpArr[0] + diff);
  return bpArr;
}

export function applyGift(room) {
  // -3% (300bp) a 4,5,6 y +3% a 1,2,3; máx 3 stacks
  if (room.config.mode !== "probalico") return { ok: false, reason: "NOT_PROBALICO" };
  if (room.probalico.giftStacks >= 3) return { ok: false, reason: "MAX_STACKS" };

  room.probalico.giftStacks += 1;
  const delta = 300;

  const p = room.probalico.probsBp;
  p[0] += delta; p[1] += delta; p[2] += delta;
  p[3] -= delta; p[4] -= delta; p[5] -= delta;

  for (let i = 0; i < 6; i++) p[i] = Math.max(0, p[i]);

  normalizeBpTo10000(p);
  return { ok: true };
}

export function rollWeightedBp(probsBp) {
  // probsBp suma 10000
  const r = Math.floor(Math.random() * 10000) + 1;
  let acc = 0;
  for (let i = 0; i < 6; i++) {
    acc += probsBp[i];
    if (r <= acc) return i + 1;
  }
  return 6;
}

export function nextTurn(room) {
  if (room.order.length === 0) return null;
  room.turnIndex = (room.turnIndex + 1) % room.order.length;
  return room.order[room.turnIndex];
}
