// Shared time zone helpers, used by the popup, content script and service worker.
(function (root) {
  "use strict";

  // Shown at the top of the picker. Every other IANA zone is available through search.
  const COMMON_ZONES = [
    ["Pacific/Honolulu", "Hawaii — Honolulu"],
    ["America/Anchorage", "Alaska — Anchorage"],
    ["America/Los_Angeles", "Pacific Time — Los Angeles, Seattle"],
    ["America/Phoenix", "Arizona — Phoenix (no DST)"],
    ["America/Denver", "Mountain Time — Denver, El Paso"],
    ["America/Chicago", "Central Time — Chicago, Dallas, Houston"],
    ["America/New_York", "Eastern Time — New York, Toronto"],
    ["America/Mexico_City", "Mexico City"],
    ["America/Sao_Paulo", "Brasília — São Paulo"],
    ["UTC", "UTC — Coordinated Universal Time"],
    ["Europe/London", "UK — London, Dublin"],
    ["Europe/Berlin", "Central Europe — Berlin, Paris, Madrid"],
    ["Europe/Athens", "Eastern Europe — Athens, Kyiv"],
    ["Africa/Lagos", "West Africa — Lagos"],
    ["Africa/Johannesburg", "South Africa — Johannesburg"],
    ["Europe/Moscow", "Moscow"],
    ["Asia/Dubai", "Gulf — Dubai, Abu Dhabi"],
    ["Asia/Karachi", "Pakistan — Karachi"],
    ["Asia/Kolkata", "India — Mumbai, Delhi, Bengaluru"],
    ["Asia/Dhaka", "Bangladesh — Dhaka"],
    ["Asia/Bangkok", "Indochina — Bangkok, Jakarta"],
    ["Asia/Singapore", "Singapore, Kuala Lumpur"],
    ["Asia/Shanghai", "China — Beijing, Shanghai"],
    ["Asia/Manila", "Philippines — Manila"],
    ["Asia/Tokyo", "Japan — Tokyo"],
    ["Asia/Seoul", "Korea — Seoul"],
    ["Australia/Perth", "Australia West — Perth"],
    ["Australia/Sydney", "Australia East — Sydney, Melbourne"],
    ["Pacific/Auckland", "New Zealand — Auckland"]
  ];

  // Common abbreviations people search for. Some are ambiguous worldwide; these are the usual meanings.
  const ALIASES = {
    IST: "Asia/Kolkata", PST: "America/Los_Angeles", PDT: "America/Los_Angeles", PT: "America/Los_Angeles",
    MST: "America/Denver", MDT: "America/Denver", MT: "America/Denver",
    CST: "America/Chicago", CDT: "America/Chicago", CT: "America/Chicago",
    EST: "America/New_York", EDT: "America/New_York", ET: "America/New_York",
    AKST: "America/Anchorage", HST: "Pacific/Honolulu", GMT: "Europe/London", BST: "Europe/London",
    UTC: "UTC", CET: "Europe/Berlin", CEST: "Europe/Berlin", EET: "Europe/Athens", MSK: "Europe/Moscow",
    GST: "Asia/Dubai", PKT: "Asia/Karachi", SGT: "Asia/Singapore", HKT: "Asia/Hong_Kong",
    JST: "Asia/Tokyo", KST: "Asia/Seoul", AEST: "Australia/Sydney", AEDT: "Australia/Sydney",
    AWST: "Australia/Perth", NZST: "Pacific/Auckland", NZDT: "Pacific/Auckland", BRT: "America/Sao_Paulo",
    WAT: "Africa/Lagos", SAST: "Africa/Johannesburg", PHT: "Asia/Manila", ICT: "Asia/Bangkok"
  };

  function detectLocalZone() {
    let z = "UTC";
    try { z = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { }
    return (LEGACY[z] && isValidZone(LEGACY[z])) ? LEGACY[z] : z;
  }

  const DEFAULTS = {
    sites: {},            // { "hostname": "Area/City" } — sites shown in another zone
    lastTz: "America/New_York",
    homeTz: "",           // "" = auto-detect from the computer
    badge: true,
    hour24: false,
    recent: [],
    badgePos: null        // { right, bottom } in px
  };

  function isValidZone(tz) {
    try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
  }

  // Old names Chrome still lists next to their modern replacements.
  const LEGACY = { "Asia/Calcutta": "Asia/Kolkata", "Asia/Saigon": "Asia/Ho_Chi_Minh", "Asia/Katmandu": "Asia/Kathmandu",
    "Asia/Rangoon": "Asia/Yangon", "Europe/Kiev": "Europe/Kyiv", "Atlantic/Faeroe": "Atlantic/Faroe" };

  function allZones() {
    let list = [];
    try { list = Intl.supportedValuesOf("timeZone"); } catch { }
    const set = new Set(list.map(z => (LEGACY[z] && isValidZone(LEGACY[z])) ? LEGACY[z] : z));
    COMMON_ZONES.forEach(([id]) => set.add(id));
    set.add("UTC");
    return [...set].filter(isValidZone);
  }

  // Minutes the zone is ahead of UTC at a given instant.
  function offsetMinutes(tz, date) {
    const parts = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(date).forEach(p => { parts[p.type] = p.value; });
    const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
    return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }

  function offsetLabel(tz, date) {
    const m = offsetMinutes(tz, date || new Date());
    const sign = m < 0 ? "−" : "+";
    const a = Math.abs(m);
    return `UTC${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
  }

  // Wall-clock time in `tz` -> real instant. Handles DST transitions.
  function wallTimeToDate(y, mo, d, h, mi, tz) {
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    const off1 = offsetMinutes(tz, new Date(guess));
    let t = guess - off1 * 60000;
    const off2 = offsetMinutes(tz, new Date(t));
    if (off2 !== off1) t = guess - off2 * 60000;
    return new Date(t);
  }

  function fmt(date, tz, opts) {
    return new Intl.DateTimeFormat(undefined, Object.assign({ timeZone: tz }, opts)).format(date);
  }

  function timeOpts(hour24) {
    return { hour: "numeric", minute: "2-digit", hourCycle: hour24 ? "h23" : "h12" };
  }

  // Short name like "CST", "IST" or "UTC+5:30".
  function abbr(tz, date) {
    if (tz === "UTC") return "UTC";
    const d = date || new Date();
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(d).find(x => x.type === "timeZoneName");
    let s = p ? p.value : tz;
    if (/^Asia\/(Kolkata|Calcutta)$/.test(tz)) s = "IST";
    return s.replace(/^GMT/, "UTC");
  }

  function cityName(tz) {
    if (tz === "UTC") return "UTC";
    const last = tz.split("/").pop();
    return last.replace(/_/g, " ");
  }

  function zoneLabel(tz) {
    const c = COMMON_ZONES.find(z => z[0] === tz);
    return c ? c[1] : tz.replace(/_/g, " ");
  }

  function searchZones(query, extraFirst) {
    const q = (query || "").trim().toLowerCase();
    const zones = allZones();
    const common = new Map(COMMON_ZONES);
    const now = new Date();
    const items = zones.map(id => ({
      id,
      label: common.get(id) || id.replace(/_/g, " "),
      common: common.has(id),
      off: offsetLabel(id, now),
      ab: abbr(id, now)
    }));
    if (!q) {
      const first = (extraFirst || []).filter(isValidZone);
      const firstSet = new Set(first);
      const rec = first.map(id => items.find(i => i.id === id) || { id, label: zoneLabel(id), off: offsetLabel(id, now), ab: abbr(id, now) })
        .map(i => Object.assign({}, i, { group: "Recent" }));
      const com = COMMON_ZONES.map(([id]) => items.find(i => i.id === id)).filter(i => i && !firstSet.has(i.id))
        .map(i => Object.assign({}, i, { group: "Popular" }));
      return rec.concat(com);
    }
    const alias = ALIASES[q.toUpperCase()];
    const scored = [];
    for (const it of items) {
      const hay = `${it.id} ${it.label} ${it.off} ${it.ab}`.toLowerCase().replace(/_/g, " ");
      let score = -1;
      if (alias && it.id === alias) score = 100;
      else if (it.ab.toLowerCase() === q) score = 80;
      else if (cityName(it.id).toLowerCase().startsWith(q)) score = 60;
      else if (hay.includes(q)) score = 40;
      if (score >= 0) scored.push(Object.assign({ score: score + (it.common ? 5 : 0) }, it));
    }
    scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    return scored.slice(0, 60);
  }

  root.TZX = {
    COMMON_ZONES, ALIASES, DEFAULTS, detectLocalZone, isValidZone, allZones,
    offsetMinutes, offsetLabel, wallTimeToDate, fmt, timeOpts, abbr, cityName, zoneLabel, searchZones
  };
})(typeof self !== "undefined" ? self : window);
