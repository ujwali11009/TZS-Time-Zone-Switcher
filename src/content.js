// TimeZone Shift — floating clock on sites switched to another time zone.
// Shows the site's zone and your own zone. Click to minimise, drag to move.
(function () {
  "use strict";
  if (window.top !== window) return;
  const host = location.hostname;
  let box = null, timer = null;
  let settings = Object.assign({}, TZX.DEFAULTS);
  let detectedTz = null; // real zone, recorded by the extension (this page may be switched)

  const home = () => settings.homeTz || detectedTz || TZX.detectLocalZone();
  const siteTz = () => settings.sites && settings.sites[host];

  function build() {
    const wrap = document.createElement("div");
    wrap.id = "tz-shift-clock";
    const pos = settings.badgePos || { right: 16, bottom: 16 };
    wrap.style.cssText = `position:fixed;right:${pos.right}px;bottom:${pos.bottom}px;z-index:2147483647;`;
    const root = wrap.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .c{font:12px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#111827;color:#f9fafb;
           border-radius:10px;padding:8px 10px;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:grab;user-select:none;min-width:150px}
        .c:active{cursor:grabbing}
        .row{display:flex;justify-content:space-between;gap:14px;align-items:baseline}
        .lbl{color:#9ca3af;font-size:11px;white-space:nowrap}
        .t{font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
        .main .t{font-size:15px;color:#fbbf24}
        .d{color:#9ca3af;font-size:11px;margin-top:2px}
        .min .d,.min .home{display:none}
      </style>
      <div class="c" title="TimeZone Shift — click to minimise, drag to move">
        <div class="row main"><span class="lbl" id="sl"></span><span class="t" id="st"></span></div>
        <div class="row home"><span class="lbl" id="hl"></span><span class="t" id="ht"></span></div>
        <div class="d" id="dd"></div>
      </div>`;
    const card = root.querySelector(".c");
    try { if (sessionStorage.getItem("tz-shift-min") === "1") card.classList.add("min"); } catch { }

    // Drag to move; a click without movement toggles minimised.
    let start = null;
    card.addEventListener("pointerdown", e => {
      const r = wrap.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, right: innerWidth - r.right, bottom: innerHeight - r.bottom, moved: false };
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener("pointermove", e => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
      if (!start.moved) return;
      const right = Math.max(0, Math.min(innerWidth - 60, start.right - dx));
      const bottom = Math.max(0, Math.min(innerHeight - 30, start.bottom - dy));
      wrap.style.right = right + "px"; wrap.style.bottom = bottom + "px";
    });
    card.addEventListener("pointerup", () => {
      if (!start) return;
      if (start.moved) {
        chrome.storage.sync.set({ badgePos: { right: parseInt(wrap.style.right), bottom: parseInt(wrap.style.bottom) } });
      } else {
        card.classList.toggle("min");
        try { sessionStorage.setItem("tz-shift-min", card.classList.contains("min") ? "1" : "0"); } catch { }
      }
      start = null;
    });

    document.documentElement.appendChild(wrap);
    return { wrap, root };
  }

  function tick() {
    if (!box) return;
    const now = new Date(), tz = siteTz(), h = home(), r = box.root;
    const t = TZX.timeOpts(settings.hour24);
    r.getElementById("sl").textContent = `${TZX.cityName(tz)} · ${TZX.abbr(tz, now)}`;
    r.getElementById("st").textContent = TZX.fmt(now, tz, t);
    r.getElementById("hl").textContent = `You · ${TZX.abbr(h, now)}`;
    r.getElementById("ht").textContent = TZX.fmt(now, h, t);
    r.getElementById("dd").textContent = TZX.fmt(now, tz, { weekday: "short", month: "short", day: "numeric" }) + ` in ${TZX.cityName(tz)}`;
  }

  function render() {
    const show = settings.badge && !!siteTz();
    if (show && !box) {
      box = build();
      timer = setInterval(tick, 1000);
    } else if (!show && box) {
      clearInterval(timer); box.wrap.remove(); box = null;
    }
    tick();
  }

  chrome.storage.local.get("detectedTz", l => {
    detectedTz = l.detectedTz || null;
    chrome.storage.sync.get(TZX.DEFAULTS, s => { settings = s; render(); });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.detectedTz) { detectedTz = changes.detectedTz.newValue; tick(); return; }
    if (area !== "sync") return;
    for (const k in changes) settings[k] = changes[k].newValue;
    render();
  });
})();
