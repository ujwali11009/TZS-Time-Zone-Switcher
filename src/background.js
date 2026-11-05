// TimeZone Shift — service worker.
//
// Applies a real time zone override to tabs of enabled sites using Chrome's
// built-in emulation (the same feature as DevTools > Sensors > Timezone).
// Every Date / Intl call the site makes then behaves as if the computer were
// in the chosen zone. Nothing is read from or sent to any page or server.
importScripts("zones.js");

function hostOf(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname : null;
  } catch { return null; }
}

async function getSettings() {
  return chrome.storage.sync.get(TZX.DEFAULTS);
}

async function getAttached() {
  const { attached = [] } = await chrome.storage.session.get("attached");
  return new Set(attached);
}
async function setAttached(set) {
  await chrome.storage.session.set({ attached: [...set] });
}

async function applyToTab(tab) {
  if (!tab || tab.id == null) return false;
  const s = await getSettings();
  const h = hostOf(tab.url || tab.pendingUrl || "");
  const tz = h ? s.sites[h] : null;
  const target = { tabId: tab.id };
  const attached = await getAttached();

  if (tz && TZX.isValidZone(tz)) {
    try { await chrome.debugger.attach(target, "1.3"); } catch { /* already attached */ }
    try {
      await chrome.debugger.sendCommand(target, "Emulation.setTimezoneOverride", { timezoneId: tz });
      attached.add(tab.id);
      await setAttached(attached);
      return true;
    } catch (e) {
      console.warn("TimeZone Shift: could not override tab", tab.id, e);
      return false;
    }
  } else if (attached.has(tab.id)) {
    try { await chrome.debugger.detach(target); } catch { }
    attached.delete(tab.id);
    await setAttached(attached);
  }
  return false;
}

// Pages that are switched see the fake zone, so the real one is detected here
// (outside any page) and shared with the floating clock.
async function recordLocalZone() {
  await chrome.storage.local.set({ detectedTz: TZX.detectLocalZone() });
}

async function applyToAllTabs() {
  await recordLocalZone();
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(applyToTab));
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url || info.status === "loading") applyToTab(tab);
});

chrome.tabs.onRemoved.addListener(async tabId => {
  const a = await getAttached();
  if (a.delete(tabId)) await setAttached(a);
});

// If the user clicks "Cancel" on Chrome's debugging bar, switch that site off
// so we don't silently re-attach.
chrome.debugger.onDetach.addListener(async (source, reason) => {
  const a = await getAttached();
  a.delete(source.tabId);
  await setAttached(a);
  if (reason === "canceled_by_user" && source.tabId != null) {
    try {
      const tab = await chrome.tabs.get(source.tabId);
      const h = hostOf(tab.url);
      const s = await getSettings();
      if (h && s.sites[h]) {
        delete s.sites[h];
        await chrome.storage.sync.set({ sites: s.sites });
      }
    } catch { }
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.sites) applyToAllTabs();
});

chrome.runtime.onStartup.addListener(applyToAllTabs);
chrome.runtime.onInstalled.addListener(async () => {
  // Migrate early-version settings ({ tz, sites: [hosts] }) to per-site zones.
  const raw = await chrome.storage.sync.get(null);
  if (Array.isArray(raw.sites)) {
    const tz = raw.tz || TZX.DEFAULTS.lastTz;
    const sites = {};
    raw.sites.forEach(h => { sites[h] = tz; });
    await chrome.storage.sync.set({ sites, lastTz: tz });
    await chrome.storage.sync.remove("tz");
  }
  applyToAllTabs();
});

// The popup asks us to apply to a tab and reload it so the site re-renders its times.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "apply-and-reload") {
    (async () => {
      try {
        const tab = await chrome.tabs.get(msg.tabId);
        const ok = await applyToTab(tab);
        await chrome.tabs.reload(msg.tabId);
        sendResponse({ ok });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
});
