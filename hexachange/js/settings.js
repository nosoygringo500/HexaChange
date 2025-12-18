(() => {
  const $ = (s) => document.querySelector(s);

  function ready(fn){
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function waitHexa(maxMs = 2500){
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      const tick = () => {
        if (window.Hexa && typeof window.Hexa.socket === "function") return resolve();
        if (Date.now() - t0 > maxMs) return reject(new Error("Hexa API not ready"));
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  ready(async () => {
    try { await waitHexa(); } catch(e) {
      console.error("[settings] No se encontró window.Hexa (carga settings.js después de game-*.js).");
      return;
    }

    const gearBtn = $("#gearBtn");
    const overlay = $("#settingsOverlay");
    const box = $("#settingsBox");
    const closeBtn = $("#settingsClose");
    const circlesSel = $("#setCircles");
    const maxPlayersNum = $("#setMaxPlayers");
    const anonChk = $("#setAnon");
    const applyBtn = $("#setApply");
    const cancelBtn = $("#setCancel");

    const required = { gearBtn, overlay, box, closeBtn, circlesSel, maxPlayersNum, anonChk, applyBtn, cancelBtn };
    for (const [k,v] of Object.entries(required)) {
      if (!v) {
        console.error(`[settings] Falta elemento #${k} (revisa IDs en el HTML).`);
        return;
      }
    }

    const open = () => { overlay.classList.add("open")
