(() => {
  const ROOM_KEY = "hexachange_room";
  const NAME_KEY = "hexachange_name";
  const MODE_KEY = "hexachange_mode";
  const CIRCLES_KEY = "hexachange_circles";

  const $ = (s) => document.querySelector(s);
  const socket = io();

  const roomCodeEl = $("#roomCode");
  const circleCountEl = $("#circleCount");
  const playersCountEl = $("#playersCount");
  const turnLabelEl = $("#turnLabel");
  const startedLabelEl = $("#startedLabel");

  const playersListEl = $("#playersList");
  const lanesWrapEl = $("#lanesWrap");

  const bottomTitleEl = $("#bottomTitle");
  const bottomSubEl = $("#bottomSub");

  const startBtn = $("#startBtn");
  const rollBtn = $("#rollBtn");
  const gearBtn = $("#gearBtn");

  const ui = {
    roomId: "",
    mode: "colorroll",
    circles: 20,
    lanes: [],
    waitingTimer: null,
    lastState: null,
    playersSig: ""
  };

  // API para settings.js
  window.Hexa = {
    socket: () => socket,
    roomId: () => ui.roomId,
    getState: () => ui.lastState,
    isHost: () => {
      const st = ui.lastState;
      const me = st?.players?.find(p => p.id === socket.id);
      return !!me?.isHost;
    }
  };

  function getConfig() {
    ui.roomId = localStorage.getItem(ROOM_KEY) || "------";
    ui.mode = localStorage.getItem(MODE_KEY) || "colorroll";
    ui.circles = Number(localStorage.getItem(CIRCLES_KEY)) || 20;
    const name = localStorage.getItem(NAME_KEY) || "";

    roomCodeEl.textContent = ui.roomId;
    circleCountEl.textContent = String(ui.circles);

    socket.emit("room:join", {
      roomId: ui.roomId,
      name,
      mode: ui.mode,
      circles: ui.circles
    });
  }

  function displayName(state, p, idx) {
    if (state.config.anonymous) return `P${idx + 1}`;
    return p.name;
  }

  function makeBadge(state, p, idx) {
    return state.config.anonymous ? `P${idx + 1}` : (p.name?.[0]?.toUpperCase() || "P");
  }

  function startWaitingDots() {
    if (ui.waitingTimer) return;
    let dots = 1;
    ui.waitingTimer = setInterval(() => {
      dots = (dots % 4) + 1;
      const el = document.getElementById("waitingDots");
      if (el) el.textContent = ".".repeat(dots);
    }, 600);
  }

  function stopWaitingDots() {
    if (!ui.waitingTimer) return;
    clearInterval(ui.waitingTimer);
    ui.waitingTimer = null;
  }

  function renderPlayers(state) {
    playersListEl.innerHTML = "";
    const turnId = state.turnSocketId;

    state.players.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "player-card";
      if (p.id === socket.id) card.classList.add("me");
      if (p.id === turnId) card.classList.add("turn");

      const av = document.createElement("div");
      av.className = "avatar";
      av.textContent = makeBadge(state, p, idx);
      card.appendChild(av);

      const text = document.createElement("div");
      text.innerHTML = `
        <div class="pname">${displayName(state, p, idx)}</div>
        <div class="psub">${p.isHost ? "Host" : "Jugador"} • Pos ${p.pos}</div>
      `;
      card.appendChild(text);

      const meta = document.createElement("div");
      meta.className = "pmeta";
      meta.textContent = `#${idx + 1}`;
      card.appendChild(meta);

      playersListEl.appendChild(card);
    });

    if (state.players.length < 2) {
      const card = document.createElement("div");
      card.className = "player-card";

      const av = document.createElement("div");
      av.className = "avatar";
      av.textContent = "?";
      card.appendChild(av);

      const text = document.createElement("div");
      text.innerHTML = `
        <div class="pname">Esperando jugador</div>
        <div class="psub" id="waitingDots">.</div>
      `;
      card.appendChild(text);

      playersListEl.appendChild(card);
      startWaitingDots();
    } else {
      stopWaitingDots();
    }
  }

  /* ====== PAINT PRO: carriles rectos + start-box + auto-fit ====== */
  function colorForId(id){
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue} 90% 60%)`;
  }

  function computeLaneLayout(circles){
    const node = Math.max(7, Math.min(18, Math.round(22 - circles / 12)));
    const gap  = Math.max(2, Math.min(10, Math.round(12 - circles / 25)));
    const radius = Math.max(260, Math.min(420, Math.round(280 + circles * 0.55)));
    const start = Math.max(30, Math.min(42, Math.round(38 - circles / 120)));
    return { node, gap, radius, start };
  }

  function buildLanes(playerCount, circles, players){
    lanesWrapEl.innerHTML = "";
    ui.lanes = [];

    const lanesToRender = Math.max(2, playerCount);
    const layout = computeLaneLayout(circles);

    for (let i = 0; i < lanesToRender; i++){
      const spoke = document.createElement("div");
      spoke.className = "spoke";

      const angle = (360 / lanesToRender) * i;
      spoke.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;

      const track = document.createElement("div");
      track.className = "track";
      track.style.setProperty("--node", `${layout.node}px`);
      track.style.setProperty("--gap", `${layout.gap}px`);
      track.style.setProperty("--radius", `${layout.radius}px`);
      track.style.setProperty("--start", `${layout.start}px`);

      const startBox = document.createElement("div");
      startBox.className = "start-box";

      const pid = players?.[i]?.id || ("placeholder-" + i);
      const col = colorForId(pid);

      startBox.style.borderColor = `${col}66`;
      startBox.style.boxShadow = `0 0 18px ${col}22`;
      startBox.textContent = players?.[i]?.name ? (players[i].name[0].toUpperCase()) : "?";
      track.appendChild(startBox);

      const nodes = [];
      for (let c = 1; c <= circles; c++){
        const node = document.createElement("div");
        node.className = "node" + (c === circles ? " goal" : "");

        const token = document.createElement("div");
        token.className = "token";
        token.style.background = col;
        token.style.boxShadow = `0 0 12px ${col}55`;

        node.appendChild(token);
        track.appendChild(node);
        nodes.push(node);
      }

      const tag = document.createElement("div");
      tag.className = "tag";
      tag.textContent = players?.[i]?.name || "Esperando jugador…";
      tag.style.borderColor = `${col}44`;
      track.appendChild(tag);

      spoke.appendChild(track);
      lanesWrapEl.appendChild(spoke);
      ui.lanes.push(nodes);
    }
  }

  function renderPositions(state){
    ui.lanes.forEach(nodes => nodes.forEach(n => n.classList.remove("active")));
    const circles = state.config.circles;

    state.players.forEach((p, laneIndex) => {
      const pos = p.pos;
      if (!pos || pos < 1 || pos > circles) return;
      const node = ui.lanes[laneIndex]?.[pos - 1];
      if (node) node.classList.add("active");
    });
  }
  /* ====== /PAINT PRO ====== */

  function updateBottomBar(state) {
    const me = state.players.find(p => p.id === socket.id);
    const turnId = state.turnSocketId;
    const isHost = !!me?.isHost;
    const isMyTurn = socket.id === turnId;
    const minPlayersOk = state.players.length >= 2;

    playersCountEl.textContent = String(state.players.length);
    circleCountEl.textContent = String(state.config.circles);

    const turnPlayer = state.players.find(p => p.id === turnId);
    turnLabelEl.textContent = turnPlayer
      ? displayName(state, turnPlayer, state.players.indexOf(turnPlayer))
      : "—";

    startedLabelEl.textContent = state.started ? "Iniciado" : "Esperando";
    if (gearBtn) gearBtn.style.display = isHost ? "grid" : "none";

    startBtn.style.display = (isHost && !state.started) ? "inline-block" : "none";
    startBtn.disabled = !minPlayersOk;

    rollBtn.style.display = (state.started && isMyTurn) ? "inline-block" : "none";

    if (!state.started) {
      bottomTitleEl.textContent = isHost ? "Eres el host" : "Esperando al host";
      bottomSubEl.textContent = minPlayersOk
        ? (isHost ? "Pulsa Start Host para iniciar" : "El host iniciará la partida")
        : "Se necesitan mínimo 2 jugadores";
    } else {
      bottomTitleEl.textContent = isMyTurn ? "Tu turno" : "Turno de otro jugador";
      bottomSubEl.textContent = isMyTurn ? "Tira el dado" : "Esperando tirada…";
    }
  }

  function playersSignature(state){
    const anon = state.config.anonymous ? "1" : "0";
    return anon + "|" + state.players.map(p => `${p.id}:${p.name}`).join(",");
  }

  function applyState(state) {
    ui.lastState = state;

    const sig = playersSignature(state);
    const needLanes = Math.max(2, state.players.length);
    const currentLaneCount = ui.lanes.length;
    const currentCircles = ui.lanes[0]?.length || 0;

    const needRebuild =
      currentLaneCount !== needLanes ||
      currentCircles !== state.config.circles ||
      ui.playersSig !== sig;

    if (needRebuild) {
      ui.playersSig = sig;
      buildLanes(state.players.length, state.config.circles, state.players);
    }

    renderPlayers(state);
    renderPositions(state);
    updateBottomBar(state);
  }

  socket.on("room:error", (e) => {
    if (e.code === "NEED_2_PLAYERS") {
      bottomTitleEl.textContent = "No se puede iniciar";
      bottomSubEl.textContent = "Esperando a que se una al menos 1 jugador más…";
      return;
    }
    if (e.code === "CONFIG_LOCKED") {
      bottomTitleEl.textContent = "Ajustes bloqueados";
      bottomSubEl.textContent = "No puedes cambiar settings después de iniciar.";
      return;
    }
    bottomTitleEl.textContent = "Error";
    bottomSubEl.textContent = e.code;
  });

  socket.on("room:state", (state) => applyState(state));

  startBtn.addEventListener("click", () => socket.emit("game:start", { roomId: ui.roomId }));
  rollBtn.addEventListener("click", () => socket.emit("game:roll", { roomId: ui.roomId }));

  getConfig();
})();
