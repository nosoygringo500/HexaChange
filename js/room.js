(() => {
  const ROOM_KEY = "hexachange_room";
  const NAME_KEY = "hexachange_name";
  const MODE_KEY = "hexachange_mode";
  const CIRCLES_KEY = "hexachange_circles";

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const makeRoom = () =>
    Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  const $ = (s) => document.querySelector(s);

  const nameInput = $("#nameInput");
  const modePill = $("#modePill");
  const circlesPill = $("#circlesPill");
  const debugLine = $("#debugLine");

  const newRoomCode = $("#newRoomCode");
  const regenBtn = $("#regenBtn");
  const createBtn = $("#createBtn");

  const joinCodeInput = $("#joinCodeInput");
  const joinBtn = $("#joinBtn");

  function gameFor(mode) {
    return mode === "probalico" ? "./game-probalico.html" : "./game-colorroll.html";
  }

  function sanitizeCode(v) {
    const raw = String(v || "").trim();
    const filtered = raw.split("").filter(c => chars.includes(c)).join("");
    return filtered.slice(0, 6);
  }

  function loadConfig() {
    const mode = localStorage.getItem(MODE_KEY);        // "probalico" o "colorroll"
    const circles = localStorage.getItem(CIRCLES_KEY);  // "100", etc

    // ✅ Mostrar modo
    if (mode === "probalico") modePill.textContent = "Probalico";
    else if (mode === "colorroll") modePill.textContent = "ColorRoll Lite";
    else modePill.textContent = "—";

    // ✅ Mostrar círculos
    circlesPill.textContent = circles ? circles : "—";

    // ✅ Debug real
    const parts = [];
    parts.push(`mode=${mode ?? "null"}`);
    parts.push(`circles=${circles ?? "null"}`);
    debugLine.textContent = parts.join(" | ");

    // ✅ Nombre guardado
    nameInput.value = localStorage.getItem(NAME_KEY) || "";

    // ✅ Generar código SIEMPRE
    newRoomCode.textContent = makeRoom();
  }

  function saveName() {
    const n = String(nameInput.value || "").trim().slice(0, 18);
    if (n) localStorage.setItem(NAME_KEY, n);
    else localStorage.removeItem(NAME_KEY);
  }

  regenBtn.addEventListener("click", () => {
    newRoomCode.textContent = makeRoom();
  });

  createBtn.addEventListener("click", () => {
    saveName();

    const mode = localStorage.getItem(MODE_KEY);
    const circles = localStorage.getItem(CIRCLES_KEY);

    // ✅ Si llegas aquí sin modo/círculos, te devuelve al selector correcto
    if (!mode || !circles) {
      window.location.href = "./index.html";
      return;
    }

    const code = newRoomCode.textContent;
    localStorage.setItem(ROOM_KEY, code);

    window.location.href = gameFor(mode);
  });

  joinCodeInput.addEventListener("input", () => {
    joinCodeInput.value = sanitizeCode(joinCodeInput.value);
  });

  joinBtn.addEventListener("click", () => {
    saveName();

    const mode = localStorage.getItem(MODE_KEY);
    const circles = localStorage.getItem(CIRCLES_KEY);
    if (!mode || !circles) {
      window.location.href = "./index.html";
      return;
    }

    const code = sanitizeCode(joinCodeInput.value);
    if (code.length !== 6) return;

    localStorage.setItem(ROOM_KEY, code);
    window.location.href = gameFor(mode);
  });

  // ✅ Asegura que el DOM ya exista
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadConfig);
  } else {
    loadConfig();
  }
})();
