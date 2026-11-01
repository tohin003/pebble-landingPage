// The Pebble 2.0 launch film's stills (lane launch-ui, 1 Nov 2026): Pebble 2.0.1's own frontend (the frozen v2.0.1
// tree) with the launch world (capture/mock/launch-world.js, `?world=launch`). capture.mjs loads this file with
// --scenes=capture/launch/scenes.mjs; filter with `launch-`. Every scene uses the 1440×900 window (WIDE).
//   scripts/heavy.sh launch-stills capture/with-server.sh node capture/capture.mjs launch- \
//     --scenes=capture/launch/scenes.mjs --themes=dark --scale=3 --naming=video --out=video/public/launch/ui/stills \
//     --locale=en-GB --tz=Europe/London --version=2.0.1 "--hide=.token-stats, .work-summary .summary-chips li:last-child"
// (usage lines hidden: the treatment keeps them out of the film).
const W = "world=launch&";

// The switch glows by CSS animation on the compositor's clock (style.css: stealth-breathe and stealth-spin while off;
// stealth-breathe-on, stealth-sheen and a slower stealth-spin while on): stop them at one instant of their cycle, as
// capture.mjs GLOW_AT does, so every retake shows the same moment of the same glow.
const GLOW_AT = { off: { "stealth-breathe": 1400, "stealth-spin": 900 }, on: { "stealth-breathe-on": 1800, "stealth-sheen": 1500, "stealth-spin": 1900 } };
// The Toolbox's tool the Toolbox still opens ("View code"): the one RSW-01's ask card named.
const TOOL = "kiln_ramp_time";

export default function scenes({ click, settle, emit, region, first, blur, WIDE }) {
  // Settings from the sidebar's Settings button (App.vue openSettings('models')), then a tab of its sidebar.
  async function settings(page, tab) {
    await click(page, ".sidebar-bottom .profile");
    await settle(page, 700);
    if (tab) await click(page, `#settings-tab-${tab}`);
    await page.mouse.move(2, 2); // the pointer moves on: no hover left on the tab
    await settle(page, 900);
  }
  async function holdGlow(page, state) {
    await page.evaluate((times) => {
      for (const a of document.getAnimations()) {
        if (!(a.animationName in times)) continue;
        a.pause();
        a.currentTime = times[a.animationName];
      }
    }, GLOW_AT[state]);
    await settle(page, 300);
  }
  // The held run's record: the receipt above its reply opened and closed (ThinkingDisclosure asks for the run's activity
  // when it opens), so its verdict line shows and the drawer's Steps list the run, as after a live run.
  async function held(page) {
    await click(page, ".message.latest .thinking-summary");
    await settle(page, 600);
    await click(page, ".message.latest .thinking-summary");
    await page.mouse.move(2, 2);
    await page.waitForFunction(() => !!document.querySelector(".message.latest .thinking-verdict"), { timeout: 8000 });
    await blur(page);
    await settle(page, 600);
    // the held block sits under the reply: at the conversation's end, as a person reads it
    await page.evaluate(() => { const s = document.querySelector(".conversation-scroll"); s.scrollTop = s.scrollHeight; });
    await settle(page, 500);
  }
  // The finished run's receipt above the reply, opened: the work view's cards under it (Phase 46, WorkView.vue).
  async function workView(page) {
    await click(page, ".message.latest .thinking-summary");
    await page.mouse.move(2, 2);
    await settle(page, 1200);
    await page.evaluate(() => {
      const card = document.querySelector(".message.latest .work");
      const scroller = document.querySelector(".conversation-scroll");
      if (card && scroller) scroller.scrollTop += card.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 84;
    });
    await settle(page, 600);
  }
  // A kept tool's notice in its conversation (workshop.py keep(): the `toolbox` event of a keep Pebble made on its own).
  async function kept(page) {
    const purpose = await page.evaluate(() => window.__pebble.world.live.tools.glaze_batch.purpose);
    await emit(page, "toolbox", { chat_id: "chat-glaze-batch", run_id: "run-glz-1", kind: "kept", name: "glaze_batch", purpose, reason: "", tests: 4, blind: { run: 5, passed: 5 } });
    await settle(page, 600);
    await page.evaluate(() => { const s = document.querySelector(".conversation-scroll"); if (s) s.scrollTop = s.scrollHeight; });
    await settle(page, 500);
  }

  return [
    // (a) the AgentGuard hold and its end, as stills (the clip is record.mjs launch-agentguard)
    { name: "launch-held", query: W + "scene=held", viewport: WIDE, run: async (page, shot) => { await held(page); await shot(); } },
    {
      name: "launch-held-row", query: W + "scene=held", viewport: WIDE,
      run: async (page, shot) => {
        await held(page);
        await shot("", { clip: await region(page, [".message.latest .thinking-summary", ".message.latest .thinking-verdict", ".message.latest blockquote", ".run-panel.run-conversation"], { pad: { x: 20, y: 14 } }) });
      },
    },
    // (d) the work view: the finished run's steps as cards, opened under its receipt
    { name: "launch-work-view", query: W + "scene=work-view", viewport: WIDE, run: async (page, shot) => { await workView(page); await shot(); } },
    {
      // The same, its list scrolled to the newest cards (Tests · pytest, the Verified check) and the Done summary.
      name: "launch-work-view-end", query: W + "scene=work-view", viewport: WIDE,
      run: async (page, shot) => {
        await workView(page);
        await page.evaluate(() => {
          const list = document.querySelector(".message.latest .work-list");
          const last = list && [...list.querySelectorAll(".work-entry")].at(-1);
          if (!list || !last) return;
          list.scrollTop += last.getBoundingClientRect().top - list.getBoundingClientRect().top - 150;
          // no half row at the list's top: the first row that shows starts at its edge
          const top = list.getBoundingClientRect().top, row = [...list.children].find((li) => li.getBoundingClientRect().bottom > top + 1);
          if (row) list.scrollTop += row.getBoundingClientRect().top - top;
        });
        await settle(page, 600);
        await shot();
        await shot("cards", { clip: await region(page, [".message.latest .thinking-summary", ".message.latest .thinking-verdict", ".message.latest .work"], { pad: { x: 8, y: 12 } }) });
      },
    },
    {
      name: "launch-work-view-cards", query: W + "scene=work-view", viewport: WIDE,
      run: async (page, shot) => { await workView(page); await shot("", { clip: await region(page, [".message.latest .thinking-summary", ".message.latest .thinking-verdict", ".message.latest .work"], { pad: { x: 8, y: 12 } }) }); },
    },
    // (d) Pebble's Toolbox in Settings › Skills & connectors, the kiln tool's code open
    {
      name: "launch-toolbox", query: W + "scene=settings", viewport: WIDE,
      run: async (page, shot) => {
        await settings(page, "extensions");
        await shot();
        await click(page, `.advanced-section button[aria-label="View the code of ${TOOL}"]`);
        await page.mouse.move(2, 2);
        await settle(page, 700);
        await shot("code");
      },
    },
    {
      name: "launch-toolbox-crop", query: W + "scene=settings", viewport: WIDE,
      run: async (page, shot) => {
        await settings(page, "extensions");
        const rows = await page.evaluate(() => [...document.querySelectorAll(".advanced-section > .setting-row")].length);
        if (rows < 2) throw new Error("the Toolbox lists fewer than two tools");
        // the Toolbox alone: its label down to its last tool (the Workshop's two notes lie between)
        await shot("", { clip: await region(page, [first(".advanced-section > .section-label"), ".advanced-section > .setting-row:has(button[aria-label^='View the code of'])"], { pad: { x: 18, y: 12 }, within: ".modal" }) });
      },
    },
    // (d) the Workshop's notice: a tool Pebble kept on its own (the real take RSW-01 has the ask card)
    { name: "launch-kept-card", query: W + "scene=kept", viewport: WIDE, run: async (page, shot) => { await kept(page); await shot(); } },
    {
      name: "launch-kept-card-crop", query: W + "scene=kept", viewport: WIDE,
      run: async (page, shot) => { await kept(page); await shot("", { clip: await region(page, [".toolbox-card"], { pad: { x: 16, y: 12 } }) }); },
    },
    // (d) Settings › Privacy & Stealth: Stealth Lockdown off, then on (the avatars behind wear the Veil)
    { name: "launch-privacy", query: W + "scene=settings", viewport: WIDE, run: async (page, shot) => { await settings(page, "privacy"); await holdGlow(page, "off"); await shot(); } },
    {
      name: "launch-privacy-on", query: W + "scene=settings", viewport: WIDE,
      run: async (page, shot) => {
        await settings(page, "privacy");
        await click(page, ".stealth-card button[role='switch']");
        await page.mouse.move(2, 2);
        await blur(page);
        await settle(page, 1800); // the Veil's cast (stealthVeil.ts ACTIVATE, 1.25 s)
        await holdGlow(page, "on");
        await shot();
      },
    },
    {
      name: "launch-privacy-crop", query: W + "scene=settings", viewport: WIDE,
      run: async (page, shot) => {
        await settings(page, "privacy");
        const clip = await region(page, [".settings-section:has(.stealth-card) > .section-label", ".stealth-card", ".stealth-honest", ".stealth-halves"], { pad: { x: 12, y: 14 }, within: ".modal" });
        await holdGlow(page, "off");
        await shot("off", { clip });
        await click(page, ".stealth-card button[role='switch']");
        await page.mouse.move(2, 2);
        await blur(page);
        await settle(page, 1800);
        await holdGlow(page, "on");
        await shot("on", { clip });
      },
    },
    // (d) Settings › Permissions: the three modes, Ask for approval selected; then Auto in project chosen
    { name: "launch-permissions", query: W + "scene=settings", viewport: WIDE, run: async (page, shot) => { await settings(page, "permissions"); await shot(); } },
    {
      name: "launch-permissions-crop", query: W + "scene=settings", viewport: WIDE,
      run: async (page, shot) => {
        await settings(page, "permissions");
        const clip = await region(page, ["#permission-mode-label", ".permission-modes"], { pad: { x: 18, y: 10 }, within: ".modal" });
        await shot("ask", { clip });
        await click(page, "#permission-mode-auto");
        await page.mouse.move(2, 2);
        await settle(page, 900);
        await shot("auto", { clip });
      },
    },
    // (b) Settings › Memory, as stills (the clip is record.mjs launch-memory)
    { name: "launch-memory", query: W + "scene=settings", viewport: WIDE, run: async (page, shot) => { await settings(page, "memory"); await shot(); } },
    // (c) the visual answer, as stills (the clip is record.mjs launch-visual-answer)
    {
      name: "launch-visual", query: W + "scene=visual-done", viewport: WIDE,
      run: async (page, shot) => {
        await settle(page, 600);
        await shot("table");
        await click(page, ".reply-table .tools button", { text: "Chart" });
        await page.mouse.move(2, 2);
        await settle(page, 700);
        await shot("chart");
      },
    },
  ];
}
