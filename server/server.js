import express from "express";
import http from "http";
import { Server } from "socket.io";
import {
  createRoom,
  roomSnapshot,
  applyGift,
  rollWeightedBp,
  nextTurn,
  clampCircles,
  clampMaxPlayers,
  resetPositions
} from "./room.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ["GET", "POST"] } });

const rooms = new Map();

function ensureRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, createRoom(roomId));
  return rooms.get(roomId);
}

function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.delete(socket.id);
  room.order = room.order.filter((id) => id !== socket.id);

  if (room.order.length > 0) {
    const hasHost = Array.from(room.players.values()).some(p => p.isHost);
    if (!hasHost) {
      const newHost = room.players.get(room.order[0]);
      if (newHost) newHost.isHost = true;
    }
  }

  if (room.turnIndex >= room.order.length) room.turnIndex = 0;
  socket.leave(roomId);

  if (room.order.length === 0) {
    rooms.delete(roomId);
    return;
  }

  io.to(roomId).emit("room:state", roomSnapshot(room));
}

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomId, name, mode, circles }) => {
    if (!roomId || typeof roomId !== "string") return;

    const room = ensureRoom(roomId);

    // ✅ respeta maxPlayers
    if (room.players.size >= room.config.maxPlayers) {
      socket.emit("room:error", { code: "ROOM_FULL" });
      return;
    }

    const isFirst = room.players.size === 0;
    const player = {
      id: socket.id,
      name: (name && String(name).slice(0, 18)) || `Player-${socket.id.slice(0, 4)}`,
      pos: 0,
      isHost: isFirst
    };

    room.players.set(socket.id, player);
    room.order.push(socket.id);

    // config inicial solo con el primero
    if (isFirst && !room.started) {
      const m = mode === "probalico" ? "probalico" : "colorroll";
      room.config.mode = m;
      room.config.circles = clampCircles(m, Number(circles));
      room.config.maxPlayers = 10;
      room.config.anonymous = false;
    }

    socket.join(roomId);
    if (room.order.length === 1) room.turnIndex = 0;

    io.to(roomId).emit("room:state", roomSnapshot(room));
  });

  socket.on("room:leave", ({ roomId }) => leaveRoom(socket, roomId));

  socket.on("disconnect", () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) leaveRoom(socket, roomId);
    }
  });

  // ✅ START: mínimo 2 jugadores
  socket.on("game:start", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const p = room.players.get(socket.id);
    if (!p || !p.isHost) return;

    if (room.players.size < 2) {
      socket.emit("room:error", { code: "NEED_2_PLAYERS" });
      return;
    }

    room.started = true;
    io.to(roomId).emit("room:state", roomSnapshot(room));
  });

  socket.on("game:gift", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const turnId = room.order[room.turnIndex];
    if (socket.id !== turnId) return;

    const res = applyGift(room);
    if (!res.ok) {
      socket.emit("room:error", { code: res.reason });
      return;
    }

    io.to(roomId).emit("room:state", roomSnapshot(room));
  });

  socket.on("game:roll", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (!room.started) {
      socket.emit("room:error", { code: "NOT_STARTED" });
      return;
    }

    const turnId = room.order[room.turnIndex];
    if (socket.id !== turnId) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    let roll = 1;
    if (room.config.mode === "colorroll") roll = Math.floor(Math.random() * 6) + 1;
    else roll = rollWeightedBp(room.probalico.probsBp);

    const from = player.pos;
    const to = Math.min(room.config.circles, from + roll);
    player.pos = to;

    const win = to >= room.config.circles;
    if (!win) nextTurn(room);

    io.to(roomId).emit("game:rolled", { by: socket.id, roll, from, to, win });
    io.to(roomId).emit("room:state", roomSnapshot(room));
  });

  // ✅ SETTINGS (host only, antes de iniciar)
  socket.on("game:settings", ({ roomId, circles, maxPlayers, anonymous }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const p = room.players.get(socket.id);
    if (!p || !p.isHost) return;

    if (room.started) {
      socket.emit("room:error", { code: "CONFIG_LOCKED" });
      return;
    }

    room.config.circles = clampCircles(room.config.mode, Number(circles));
    room.config.maxPlayers = clampMaxPlayers(maxPlayers);
    room.config.anonymous = !!anonymous;

    // ✅ reinicia posiciones al cambiar settings
    resetPositions(room);

    io.to(roomId).emit("room:state", roomSnapshot(room));
  });
});

server.listen(PORT, () => console.log(`[HexaChange] http://localhost:${PORT}`));
