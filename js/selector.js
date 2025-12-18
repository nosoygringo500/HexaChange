(() => {
  const ROOM_KEY = "hexachange_room";
  const MODE_KEY = "hexachange_mode";
  const CIRCLES_KEY = "hexachange_circles";

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const makeRoom = () =>
    Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  function ensureRoomCode() {
    let code = localStorage.getItem(ROOM_KEY);
    if (!code || code.length !== 6) {
      code = makeRoom();
      localStorage.setItem(ROOM_KEY, code);
    }
    const el = document.getElementById("roomCode");
    if (el) el.textContent = code;
  }

  function bindList() {
    const list = document.querySelector(".list");
    if (!list) return;

    const mode = list.getAttribute("data-mode");
    if (!mode) return;

    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".list-item");
      if (!btn) return;

      const circles = Number(btn.getAttribute("data-circles"));
      if (!Number.isFinite(circles) || circles <= 0) return;

      localStorage.setItem(MODE_KEY, mode);
      localStorage.setItem(CIRCLES_KEY, String(circles));

      // Nuevo paso obligatorio: crear o unirse a sala
      window.location.href = "./room.html";
    });
  }

  ensureRoomCode();
  bindList();
})();
