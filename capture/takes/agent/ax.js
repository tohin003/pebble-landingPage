// The take agent's eyes on the UI tree: JXA through System Events (Accessibility), READ ONLY except `hide`.
// Run as: osascript -l JavaScript - '<request json>'   (the agent passes this file's text on stdin, read once at start)
// Requests: {"cmd": "windows" | "find" | "dump" | "frontmost" | "hide" | "selftest", ...}; the reply is JSON.
// It never presses, sets a value, or performs an action on an element: a click is the agent's real pointer at the
// element's centre. `hide` sets one allowlisted process invisible (the agent's own Terminal, before a take).
"use strict";

function textsOf(n) {
  return [n.name, n.description, n.title, typeof n.value === "string" ? n.value : null].filter((t) => typeof t === "string" && t.length);
}

// A node matches when every criterion given holds: its role, a text exactly `name`, a text containing `contains`.
function matches(n, q) {
  if (q.role && n.role !== q.role) return false;
  const texts = textsOf(n);
  if (q.name && !texts.some((t) => t === q.name)) return false;
  if (q.contains && !texts.some((t) => t.indexOf(q.contains) >= 0)) return false;
  return true;
}

function centre(n) {
  return n.position && n.size ? { x: n.position[0] + n.size[0] / 2, y: n.position[1] + n.size[1] / 2 } : null;
}

function bulk(spec, prop, count) {
  try {
    const v = spec[prop]();
    if (Array.isArray(v) && v.length === count) return v;
  } catch (e) { /* the property is missing on some element: fetch one by one below */ }
  const out = [];
  for (let i = 0; i < count; i++) {
    try { out.push(spec.at(i)[prop]()); } catch (e) { out.push(null); }
  }
  return out;
}

// A property that may not exist in this System Events: the whole list, or null (never one event per element).
function bulkOrNull(spec, prop, count) {
  try {
    const v = spec[prop]();
    return Array.isArray(v) && v.length === count ? v : null;
  } catch (e) { return null; }
}

// Walk a tree level by level with one Apple Event per property per parent (not per element). `limits.deadline` is
// one deadline for the whole request, however many windows it walks.
function walk(win, limits, visit) {
  const deadline = limits.deadline;
  let seen = 0;
  const stack = [{ spec: win, depth: 0, path: "" }];
  while (stack.length) {
    const { spec, depth, path } = stack.pop();
    if (depth >= limits.depth || seen >= limits.max || Date.now() > deadline) continue;
    let roles;
    try { roles = spec.uiElements.role(); } catch (e) { continue; }
    const k = roles.length;
    if (!k) continue;
    const names = bulk(spec.uiElements, "name", k);
    // "description" falls back to the role's own description ("button", "group") when an element has none; the
    // accessibility description doesn't, so it is used where this System Events has it
    const descs = bulkOrNull(spec.uiElements, "accessibilityDescription", k) || bulk(spec.uiElements, "description", k);
    const titles = bulk(spec.uiElements, "title", k);
    const values = bulk(spec.uiElements, "value", k);
    const pos = bulk(spec.uiElements, "position", k);
    const size = bulk(spec.uiElements, "size", k);
    for (let i = k - 1; i >= 0; i--) {
      seen++;
      const n = { role: roles[i], name: names[i], description: descs[i], title: titles[i], value: values[i],
        position: pos[i], size: size[i], depth: depth + 1, path: path + "/" + i };
      if (visit(n) === false) return { seen, stopped: true };
      stack.push({ spec: spec.uiElements.at(i), depth: depth + 1, path: n.path });
    }
  }
  return { seen, stopped: false, timedOut: Date.now() > deadline };
}

function processNamed(se, name) {
  const ps = se.processes.whose({ name: name });
  return ps.length ? ps[0] : null;
}

function windowsOf(p, contains) {
  const names = p.windows.name();
  const out = [];
  for (let i = 0; i < names.length; i++) {
    if (!contains || (names[i] || "").indexOf(contains) >= 0) out.push({ spec: p.windows.at(i), title: names[i] || "" });
  }
  return out;
}

// What to walk: the windows; but the Dock's icons (its list), the menu bar's items and a process without windows
// live on the process itself, so those are walked from the process.
const PROCESS_ROOTS = ["Dock", "ControlCenter", "SystemUIServer"];
function rootsOf(p, name, contains) {
  if (PROCESS_ROOTS.indexOf(name) >= 0) return [{ spec: p, title: "(" + name + ")" }];
  const ws = windowsOf(p, contains);
  return ws.length || contains ? ws : [{ spec: p, title: "(" + name + ")" }];
}

function brief(n) {
  const v = typeof n.value === "string" ? n.value.slice(0, 120) : (n.value === null || n.value === undefined ? null : String(n.value).slice(0, 40));
  return { role: n.role, name: n.name || null, description: n.description || null, title: n.title || null, value: v,
    x: n.position ? n.position[0] : null, y: n.position ? n.position[1] : null, w: n.size ? n.size[0] : null, h: n.size ? n.size[1] : null,
    centre: centre(n), depth: n.depth };
}

const handlers = {
  selftest(q) {
    // Exercises the matching logic without System Events (the agent's tests run this in any account).
    const nodes = [
      { role: "AXButton", name: "Allow", position: [100, 200], size: [80, 30] },
      { role: "AXButton", description: "Don't allow", position: [200, 200], size: [80, 30] },
      { role: "AXStaticText", value: "Pebble · Open day: a card is waiting", position: [10, 10], size: [300, 20] },
    ];
    return {
      allow: nodes.filter((n) => matches(n, { role: "AXButton", name: "Allow" })).map(brief),
      contains: nodes.filter((n) => matches(n, { contains: "Open day" })).map(brief),
      none: nodes.filter((n) => matches(n, { role: "AXButton", name: "Allow all" })).length,
    };
  },
  frontmost() {
    const se = Application("System Events");
    const p = se.processes.whose({ frontmost: true });
    return { app: p.length ? p[0].name() : null };
  },
  windows(q) {
    const se = Application("System Events");
    const p = processNamed(se, q.app);
    if (!p) return { running: false, windows: [] };
    const ws = windowsOf(p, null);
    const pos = bulk(p.windows, "position", ws.length);
    const size = bulk(p.windows, "size", ws.length);
    return { running: true, frontmost: p.frontmost(), visible: p.visible(),
      windows: ws.map((w, i) => ({ title: w.title, x: pos[i] ? pos[i][0] : null, y: pos[i] ? pos[i][1] : null,
        w: size[i] ? size[i][0] : null, h: size[i] ? size[i][1] : null })) };
  },
  find(q) {
    const se = Application("System Events");
    const p = processNamed(se, q.app);
    if (!p) return { running: false, matches: [] };
    const found = [];
    const limits = { depth: q.depth || 30, max: q.max || 4000, deadline: Date.now() + (q.ms || 8000) };
    let seen = 0;
    const wpos = bulk(p.windows, "position", p.windows.length);
    const wsize = bulk(p.windows, "size", p.windows.length);
    const wnames = p.windows.name();
    for (let i = 0; i < wnames.length; i++) {
      // the windows themselves are candidates too (role AXWindow, named by their title): a window's frame finds its title bar
      const n = { role: "AXWindow", name: wnames[i], position: wpos[i], size: wsize[i], depth: 0 };
      if ((!q.window_contains || (wnames[i] || "").indexOf(q.window_contains) >= 0) && matches(n, q) && n.position && n.size) {
        const b = brief(n);
        b.window = wnames[i];
        found.push(b);
      }
    }
    for (const w of rootsOf(p, q.app, q.window_contains)) {
      const r = walk(w.spec, limits, (n) => {
        if (matches(n, q) && n.position && n.size && n.size[0] > 0 && n.size[1] > 0) {
          const b = brief(n);
          b.window = w.title;
          found.push(b);
          if (found.length > 60) return false;
        }
        return true;
      });
      seen += r.seen;
    }
    // reading order: top to bottom, then left to right
    found.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return { running: true, seen: seen, matches: found };
  },
  dump(q) {
    const se = Application("System Events");
    const p = processNamed(se, q.app);
    if (!p) return { running: false, windows: [] };
    const out = [];
    const limits = { depth: q.depth || 30, max: q.max || 1500, deadline: Date.now() + (q.ms || 20000) };
    for (const w of rootsOf(p, q.app, q.window_contains)) {
      const nodes = [];
      const r = walk(w.spec, limits, (n) => { nodes.push(brief(n)); return true; });
      out.push({ title: w.title, seen: r.seen, timedOut: !!r.timedOut, nodes: nodes });
    }
    return { running: true, windows: out };
  },
  hide(q) {
    const se = Application("System Events");
    const p = processNamed(se, q.app);
    if (!p) return { running: false };
    p.visible = false;
    return { running: true, hidden: true };
  },
};

function run(argv) {
  let q;
  try { q = JSON.parse(argv[0]); } catch (e) { return JSON.stringify({ ok: false, error: "bad request: " + e }); }
  const h = handlers[q.cmd];
  if (!h) return JSON.stringify({ ok: false, error: "unknown command " + q.cmd });
  try {
    return JSON.stringify({ ok: true, result: h(q) });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
