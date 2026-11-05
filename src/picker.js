// Searchable time zone picker: type a city, country, abbreviation (IST, PST…) or UTC offset.
(function () {
  "use strict";

  function createPicker(el, opts) {
    let value = opts.value;
    let items = [];
    let active = 0;

    el.innerHTML = "";
    const input = document.createElement("input");
    input.className = "pk-in";
    input.type = "text";
    input.spellcheck = false;
    input.autocomplete = "off";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-label", opts.ariaLabel || "Time zone");
    input.placeholder = "Search city, country, IST, UTC+2…";
    const list = document.createElement("div");
    list.className = "pk-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    el.append(input, list);

    function display() {
      const now = new Date();
      input.value = `${TZX.zoneLabel(value)}  (${TZX.abbr(value, now)})`;
    }

    function renderList() {
      items = TZX.searchZones(input.value,opts.recent ? opts.recent() : []);
      list.innerHTML = "";
      if (!items.length) {
        const e = document.createElement("div"); e.className = "pk-empty"; e.textContent = "No matching time zone";
        list.appendChild(e); return;
      }
      let lastGroup = null;
      items.forEach((it, i) => {
        if (it.group && it.group !== lastGroup) {
          const g = document.createElement("div"); g.className = "pk-group"; g.textContent = it.group;
          list.appendChild(g); lastGroup = it.group;
        }
        const row = document.createElement("div");
        row.className = "pk-item" + (i === active ? " active" : "") + (it.id === value ? " sel" : "");
        row.setAttribute("role", "option");
        row.dataset.i = i;
        const l = document.createElement("span"); l.className = "l"; l.textContent = it.label;
        const r = document.createElement("span"); r.className = "r"; r.textContent = it.ab.startsWith("UTC") ? it.off : `${it.ab} · ${it.off}`;
        row.append(l, r);
        row.addEventListener("mousedown", ev => { ev.preventDefault(); choose(i); });
        list.appendChild(row);
      });
    }

    function open() {
      if (el.classList.contains("disabled")) return;
      input.value = "";
      active = 0;
      renderList();
      list.hidden = false;
    }
    function close() { list.hidden = true; display(); }

    function choose(i) {
      const it = items[i];
      if (!it) return;
      value = it.id;
      close();
      input.blur();
      opts.onChange && opts.onChange(value);
    }

    function move(d) {
      if (!items.length) return;
      active = (active + d + items.length) % items.length;
      renderList();
      const row = list.querySelector(".pk-item.active");
      row && row.scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("focus", open);
    input.addEventListener("blur", () => setTimeout(close, 100));
    input.addEventListener("input", () => { active = 0; renderList(); list.hidden = false; });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); choose(active); }
      else if (e.key === "Escape") { e.preventDefault(); input.blur(); }
    });

    display();
    return {
      get value() { return value; },
      set value(v) { value = v; display(); },
      setDisabled(b) { el.classList.toggle("disabled", b); input.disabled = b; }
    };
  }

  window.createPicker = createPicker;
})();
