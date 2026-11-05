"use strict";
const $ = id => document.getElementById(id);
let settings = Object.assign({}, TZX.DEFAULTS);
let currentTab = null, currentHost = null;
let sitePicker, fromPicker, toPicker, homePicker;

const home = () => settings.homeTz || TZX.detectLocalZone();
const siteOn = () => !!(currentHost && settings.sites[currentHost]);
const targetTz = () => (siteOn() ? settings.sites[currentHost] : settings.lastTz);

function save(patch) {
  Object.assign(settings, patch);
  return chrome.storage.sync.set(patch);
}

function addRecent(tz) {
  const recent = [tz, ...settings.recent.filter(z => z !== tz)].slice(0, 5);
  save({ recent });
}

function updateClocks() {
  const now = new Date(), t = TZX.timeOpts(settings.hour24);
  const d = { weekday: "short", month: "short", day: "numeric" };
  const tz = targetTz(), h = home();
  $("cTargetLbl").textContent = `${TZX.cityName(tz)} · ${TZX.abbr(tz, now)}`;
  $("cTarget").textContent = TZX.fmt(now, tz, t);
  $("cTargetD").textContent = TZX.fmt(now, tz, d);
  $("cHomeLbl").textContent = `You · ${TZX.abbr(h, now)}`;
  $("cHome").textContent = TZX.fmt(now, h, t);
  $("cHomeD").textContent = TZX.fmt(now, h, d);
}

function updateSiteUI() {
  const tz = sitePicker.value;
  $("siteToggleLbl").textContent = `Show this site in ${TZX.cityName(tz)} time`;
  $("siteToggle").checked = siteOn();
  $("siteNote").hidden = !siteOn();
  renderSiteList();
  updateClocks();
}

function renderSiteList() {
  const ul = $("siteList");
  ul.innerHTML = "";
  const hosts = Object.keys(settings.sites).sort();
  if (!hosts.length) {
    const li = document.createElement("li"); li.className = "empty"; li.textContent = "None yet";
    ul.appendChild(li); return;
  }
  hosts.forEach(h => {
    const li = document.createElement("li");
    const s = document.createElement("span");
    s.textContent = h + " ";
    const sm = document.createElement("small"); sm.textContent = TZX.cityName(settings.sites[h]);
    s.appendChild(sm);
    const b = document.createElement("button"); b.textContent = "Remove";
    b.addEventListener("click", async () => {
      const sites = Object.assign({}, settings.sites); delete sites[h];
      await save({ sites });
      if (h === currentHost) chrome.runtime.sendMessage({ type: "apply-and-reload", tabId: currentTab.id });
      updateSiteUI();
    });
    li.append(s, b); ul.appendChild(li);
  });
}

function convert() {
  const v = $("when").value;
  if (!v) { $("out").textContent = "—"; $("outSub").textContent = ""; return; }
  const [date, time] = v.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const from = fromPicker.value, to = toPicker.value;
  const instant = TZX.wallTimeToDate(y, mo, d, h, mi, from);
  const o = Object.assign({ weekday: "short", month: "short", day: "numeric" }, TZX.timeOpts(settings.hour24));
  $("out").textContent = `${TZX.fmt(instant, to, o)} ${TZX.abbr(to, instant)}`;
  $("outSub").textContent = `= ${TZX.fmt(instant, from, o)} ${TZX.abbr(from, instant)}`;
}

function nowInZoneForInput(tz) {
  const p = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

async function init() {
  settings = await chrome.storage.sync.get(TZX.DEFAULTS);
  chrome.storage.local.set({ detectedTz: TZX.detectLocalZone() });
  if (Array.isArray(settings.sites)) settings.sites = {}; // migrated by the service worker
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const u = new URL(currentTab.url);
    if (/^https?:$/.test(u.protocol)) currentHost = u.hostname;
  } catch { }

  const recent = () => settings.recent;

  // This site
  sitePicker = createPicker($("sitePicker"), {
    value: targetTz(), recent, ariaLabel: "Time zone for this site",
    onChange: async tz => {
      addRecent(tz);
      if (siteOn()) {
        await save({ sites: Object.assign({}, settings.sites, { [currentHost]: tz }), lastTz: tz });
        chrome.runtime.sendMessage({ type: "apply-and-reload", tabId: currentTab.id });
      } else {
        await save({ lastTz: tz });
      }
      if (toPicker) { toPicker.value = tz; convert(); }
      updateSiteUI();
    }
  });

  if (currentHost) {
    $("siteName").textContent = currentHost;
  } else {
    $("siteName").textContent = "Open a website tab to switch its time zone";
    $("siteToggle").disabled = true;
  }

  $("siteToggle").addEventListener("change", async e => {
    const sites = Object.assign({}, settings.sites);
    if (e.target.checked) sites[currentHost] = sitePicker.value; else delete sites[currentHost];
    await save({ sites, lastTz: sitePicker.value });
    addRecent(sitePicker.value);
    chrome.runtime.sendMessage({ type: "apply-and-reload", tabId: currentTab.id });
    updateSiteUI();
  });

  // Converter
  fromPicker = createPicker($("fromPicker"), { value: home(), recent, ariaLabel: "Convert from", onChange: tz => { addRecent(tz); convert(); } });
  toPicker = createPicker($("toPicker"), { value: targetTz(), recent, ariaLabel: "Convert to", onChange: tz => { addRecent(tz); convert(); } });
  $("when").value = nowInZoneForInput(fromPicker.value);
  $("when").addEventListener("input", convert);
  $("swap").addEventListener("click", () => {
    const f = fromPicker.value; fromPicker.value = toPicker.value; toPicker.value = f; convert();
  });
  $("nowBtn").addEventListener("click", () => { $("when").value = nowInZoneForInput(fromPicker.value); convert(); });
  $("copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("out").textContent);
    $("copy").textContent = "Copied"; setTimeout(() => { $("copy").textContent = "Copy"; }, 1200);
  });

  // Settings
  $("detected").textContent = `Detected: ${TZX.zoneLabel(TZX.detectLocalZone())}`;
  $("autoHome").checked = !settings.homeTz;
  $("homeWrap").hidden = !settings.homeTz;
  homePicker = createPicker($("homePicker"), {
    value: home(), recent, ariaLabel: "My time zone",
    onChange: tz => { save({ homeTz: tz }); updateClocks(); }
  });
  $("autoHome").addEventListener("change", e => {
    $("homeWrap").hidden = e.target.checked;
    save({ homeTz: e.target.checked ? "" : homePicker.value });
    updateClocks();
  });
  $("badge").checked = settings.badge;
  $("badge").addEventListener("change", e => save({ badge: e.target.checked }));
  $("hour24").checked = settings.hour24;
  $("hour24").addEventListener("change", e => { save({ hour24: e.target.checked }); updateClocks(); convert(); });

  updateSiteUI();
  convert();
  setInterval(updateClocks, 1000);
}

init();
