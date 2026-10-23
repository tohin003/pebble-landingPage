# Claims register

Every factual sentence on the site, in the film's on-screen text and transcript, in `llms.txt` and in the metadata,
mapped to its source. The copy lives in `src/content/` (`copy.ts`, `faq.ts`, `credits.ts`, `chapters.ts`, `seo.ts`);
the `[C-…]` tags in those files are the IDs below. Written by Lane A on 2026-10-22 (IST). Checked sentence by sentence
and updated by the claims review on 2026-10-23: changed rows say "(review)", new rows are in "Claims review
(2026-10-23)" at the end, and every edit is logged with its reason in `.work/handoffs/HANDOFF-claims-review.md`. The
release session's feature corrections (OVERRIDES §12, STATUS 14:58) were applied later the same day: those rows say
"(§12)", and "OVERRIDES §12 corrections (2026-10-23)" at the end lists every change and every withdrawn claim. The
"Corrections" of Pebble's 1.0.3 changelog (`CHANGELOG.md@checkout:31-57`) followed: those rows say "(1.0.3)", and
"1.0.3 Corrections (2026-10-23)" at the end lists every change and every withdrawn claim.

**Rule:** a sentence that cannot be traced here is rewritten or removed (MASTER_PLAN §9.3). Headings, button labels,
greetings and other sentences that state no fact ("You set the pace.", "Say hi to Pebble.") need no row.

## How to read the sources

| Notation | Means |
|---|---|
| `README.md@v1.0.1:12` | Line 12 of that file at tag `v1.0.1` of github.com/tohin003/Pebble (raw: `https://raw.githubusercontent.com/tohin003/Pebble/v1.0.1/README.md`). Tag copies are immutable. Every file cited here is byte-identical to the read-only checkout `PEBBLE_REPO` (checked with `cmp` at 23:45 IST), **except `README.md`**: the release session is rewriting the checkout's README as a showcase page (393 lines at 23:38), so README citations use the 162-line tag copy. |
| `README.md@207ec74:98` | Line 98 of the README published on `main` at commit `207ec74` (the release session's showcase README, 494 lines; raw: `https://raw.githubusercontent.com/tohin003/Pebble/207ec7400abd9d01720d8bba0b091b5a8948bc7e/README.md`). The release session gives its statements as true (STATUS 23:32, 00:00). Used for the showcase facts that the v1.0.1 tag README lacks. The checkout now also holds unreleased 1.0.2 work (`CHANGELOG.md`, `App.vue`, `AdvancedSettings.vue` differ from the tag), so 1.0.1 behaviour is still cited from the tag copies. |
| `STATUS §Release facts`, `STATUS 23:27` | `../PEBBLE_SESSIONS_STATUS.md`, outside this repository: the status file shared with the Pebble release session. Its "Release facts" section, or the release session's update at that time. |
| `CHANGELOG.md@checkout:44` | Line 44 of that file in the read-only checkout `PEBBLE_REPO` as it stood at 15:04–15:16 IST on 2026-10-23: the release session's unreleased 1.0.3 work (Phase 30; `README.md` saved 15:04, `docs/USER_GUIDE.md` 15:05, `CHANGELOG.md` 15:06). Cited for the OVERRIDES §12 corrections, which the release session says hold for 1.0.3 (STATUS 14:58), and for the changelog's 1.0.3 "Corrections" (`CHANGELOG.md@checkout:31-57`; re-read at about 15:30, when `CHANGELOG.md` and `docs/USER_GUIDE.md` were unchanged since 15:06 and 15:05; `README.md`, saved again at 15:22, is cited only as support). Those are documentation corrections, so they hold for 1.0.1 too; where a row says so, the 1.0.1 code is cited at tag `v1.0.1` (three more tag files fetched at 15:31: `backend/pebble/runner.py`, `backend/pebble/guard.py`, and `backend/vendor/agentguard/verify/completion_gate.py`, which `cmp` shows is identical to the checkout's). Line numbers can move while that session edits; the quoted words are what count. |
| `OVERRIDES §n`, `PLAN §n` | The landing session's planning docs (`OVERRIDES.md`, `MASTER_PLAN.md`; copies in `.work/research/`). |
| `fixtures.js` | U2's capture fixtures (`capture/mock/fixtures.js`): the fictional demo world (Maya, invoice-kit, Lisbon trip, datetime quiz). |

**Kinds:** **V** = Pebble's own interface text, word for word. **Q** = a doc sentence quoted or lightly trimmed (same
meaning, same qualifiers). **D** = derived from the cited lines; the reasoning is in the notes. **S** = sample data,
always shown with "Shown with sample data." **I** = a fact about this site, checked by the QA gates (§9.2).

---

## Release facts

| ID | Claim on the site | Source | Kind / notes |
|---|---|---|---|
| C-REL-1 | (v2 sections B) Pebble 1.0.4 (version, `v1.0.4`) | STATUS 20:34 ("1.0.4 published" … "For the page: "v1.0.4 · 72 MB""); OVERRIDES §16; the GitHub API (`releases/latest`: tag `v1.0.4`, read 2026-10-24 00:10 IST) | Q. One source: `src/content/releaseFacts.ts`. `src/lib/release.ts` may replace it with the latest tag at build time. Was 1.0.1 (STATUS 23:27) |
| C-REL-2 | (v2 sections B) "72 MB" (71,808,389 bytes) | STATUS 20:34 ("`Pebble-macos-arm64.zip` (71,808,389 bytes, about 72 MB)"); OVERRIDES §16; the GitHub API (asset size 71,808,389) | Q. Decimal MB, rounded. Was 71,805,116 bytes (1.0.1) |
| C-REL-3 | (v2 sections B) Released 23 October 2026 | STATUS 20:34; the GitHub API (`published_at` 2026-10-23T15:02:34Z, 20:32 IST) | Q. Was 22 October 2026 (1.0.1) |
| C-REL-4 | `curl -fsSL https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh \| bash` | STATUS §Release facts ("Show the install command exactly"); OVERRIDES §1; `README.md@v1.0.1:22` | V (exact). STATUS 23:27: the installer passed against the live release |
| C-REL-5 | (v2 sections B) "v1.0.4 · 72 MB · Apple silicon · macOS 12 or later", rendered as a list | OVERRIDES §1 (example line), §16 ("render the facts as a list, never a middle-dot string"); `README.md@v1.0.1:17` | Q |
| C-REL-6 | (v2 sections B) The zip's line in `SHA256SUMS` for v1.0.4: `630af5c1344ab67bbae3f8de313ed260ad0794774d376a21f0b90d8ab856470d  Pebble-macos-arm64.zip` (Install, by hand, under the checksum step, only while the release the page offers is v1.0.4) | The release's own `SHA256SUMS` (`https://github.com/tohin003/Pebble/releases/download/v1.0.4/SHA256SUMS`, read 2026-10-24 00:10 IST) | V (verbatim). One source: `releaseFacts.sha256`. Its limit, C-LIM-3, sits beside it |

Download, checksum, release and script URLs: STATUS §Release facts; all returned HTTP 200 at 23:45 IST (see "Checks run").

## Honest limits (OVERRIDES §2)

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-LIM-1 | Pebble is signed with its own stable identity, not an Apple Developer ID. | OVERRIDES §2; STATUS §Release facts; `README.md@v1.0.1:64-65`; `SECURITY.md@v1.0.1:55` | Q (exact OVERRIDES wording) |
| C-LIM-2 | Pebble is not notarized. | OVERRIDES §2; `README.md@v1.0.1:65`, `:149`; `SECURITY.md@v1.0.1:55` | Q |
| C-LIM-3 | `SHA256SUMS` shows the download is intact. It does not prove who made it. (short form: "the checksum shows the download is intact, not who made it") | OVERRIDES §2; `README.md@v1.0.1:67-68`; `SECURITY.md@v1.0.1:56`; `CHANGELOG.md@v1.0.1:91-92` | Q |
| C-LIM-4 | No independent security audit has been done yet. | OVERRIDES §2; `README.md@v1.0.1:149`; `SECURITY.md@v1.0.1:58` | Q |
| C-LIM-5 | Runs on Macs with Apple silicon (M1 or later); no version for Intel Macs, Windows or Linux. | `README.md@v1.0.1:17`, `:148`; STATUS §Release facts ("Platform"); `install.sh@v1.0.1:109-112` (refuses Rosetta and non-arm64) | Q |
| C-LIM-6 | Pebble 1.0 doesn't check for updates by itself; run the installer again to update. | `README.md@v1.0.1:88-90`, `:149`; `docs/USER_GUIDE.md@v1.0.1:266`; `CHANGELOG.md@v1.0.1:93` | Q |
| C-LIM-7 | Models make mistakes, including confident ones, so check the evidence Pebble shows you. | `README.md@v1.0.1:150`; `src/App.vue@v1.0.1:2396` ("Pebble can make mistakes. Check the evidence.") | Q |
| C-LIM-8 | AgentGuard checks evidence such as test runs. It is not a security layer, and it cannot make every answer right. | `README.md@v1.0.1:150-151`; `SECURITY.md@v1.0.1:54` | Q |
| C-LIM-9 | Commands and parsers run in macOS's sandbox, which limits them but is not a promise against every attack. Prompt injection from web pages or files is limited, not impossible. | `README.md@v1.0.1:151-152`; `SECURITY.md@v1.0.1:51-53` | Q |
| C-LIM-10 | (§12) Pebble for Chrome isn't in the Chrome Web Store for 1.0: you load it in Chrome's Developer mode. It has been tested against a simulated Chrome, not yet in a real one. Pebble's own built-in browser is not available yet. | `README.md@v1.0.1:123-124`, `:155`; `docs/USER_GUIDE.md@v1.0.1:200-201`; `CHANGELOG.md@v1.0.1:95`. Simulated Chrome: STATUS 14:58 ("It has been tested against a simulated Chrome, not yet in a real one"); OVERRIDES §12; `CHANGELOG.md@checkout:40-43`; `README.md@checkout:528-529`; `docs/USER_GUIDE.md@checkout:206-208`; `browser-extension/worker.test.mjs@checkout:1` ("the service worker against a fake Chrome"); `docs/HARNESS_BROWSER_EXTENSION.md@checkout:3` ("Nothing here has run against a real Chrome yet") | Q. OVERRIDES §12: said wherever Chrome is described at length (here, the `more` tile's limit and `llms.txt`) |
| C-LIM-11 | (§12) Scheduled tasks run only while Pebble is open. Their results show in Pebble; macOS notifications are off until you turn them on. (Also the limit line of `orchestration` and of the unused `more` "Bigger tasks" tile, and `llms.txt`.) | `README.md@v1.0.1:156`; `docs/USER_GUIDE.md@v1.0.1:182`. Results and notifications: STATUS 14:58 ("results show in Pebble; macOS notifications are off until you turn them on"); OVERRIDES §12; `CHANGELOG.md@checkout:49` ("Results appear in Details › Tools; macOS notifications are off until you turn them on."); `docs/USER_GUIDE.md@checkout:186-187`; `README.md@checkout:268`; `backend/pebble/notifications.py@checkout:19` (settings "off until the person enables it in Settings"), `:41` (`DEFAULT_SETTINGS = {'enabled': False, …}`) | Q. 1.0.1's guide said "their results arrive as notifications" (`docs/USER_GUIDE.md@v1.0.1:182-183`); the page never used that, and now says where results go |
| C-LIM-12 | Web search uses Bing's RSS feed, which may change or stop without notice. The free Open-Meteo weather service is for non-commercial use. | `README.md@v1.0.1:153-154`; `NOTICE.md@v1.0.1:59-61` | Q |
| C-LIM-13 | Pebble honours Reduce Motion, and VoiceOver hears the state of every switch, tab and permission mode, but an accessibility audit is still to come. | `docs/USER_GUIDE.md@v1.0.1:28`; `CHANGELOG.md@v1.0.1:76-77`; `docs/ARCHITECTURE.md@v1.0.1:51` ("an accessibility audit … remain necessary") | Q |
| C-LIM-14 | Other software on your Mac: Pebble doesn't defend against other software running as your own macOS user. Such software can read Pebble's data folder and change its settings, and it could make Pebble's backend use a saved key or sign-in without a prompt. | `SECURITY.md@v1.0.1:57` ("Pebble does not defend against other software running as your own macOS user. Such software can read Pebble's data folder and change its settings, and it can start Pebble's own backend so that the backend reads your saved API key or ChatGPT sign-in without a prompt …"); DESIGN §9 (lead decision: the limits add it) | Q. Shortened; "could" because it describes what such software is able to do |
| C-LIM-15 | (§12, new) Other apps: Pebble can't see or operate other apps yet. It can only open one, which in the default mode waits for your approval. (Also `llms.txt`; the same fact under the quoted permission sentence is C-EXP-14.) | STATUS 14:58 ("Pebble can't see or operate other apps yet; it can only open one, with approval. Don't say it controls apps or windows."); OVERRIDES §12; `CHANGELOG.md@checkout:38-39`; `README.md@checkout:529` ("Pebble's own built-in browser and control of other apps' windows are not available yet."). Code: `backend/pebble/app.py@checkout:159` (screen sessions get `AppAdapter(ax_worker.BlockedBackend())` for apps); `src/components/ScreenSessions.vue@checkout:13-14` ("the app-window grant is not offered until Pebble can read app identities", Phase 24, so 1.0.1 too), `:260`; `backend/pebble/native_apps.py@checkout:15-16` ("A launch receipt never shows that the app was operated"); `backend/pebble/app.py@checkout:3181-3189` (`open_app` proposes an "app" action). When it asks: `src/permissionModes.ts@v1.0.1:24`, `:30`, `:35`; `backend/pebble/permissions.py@checkout:82-93` | Q, D. The release session's "with approval" holds in Ask for approval (the default) and Auto in project; in Full access an app launch runs without asking (`permissionModes.ts:35`), so the line says "in the default mode" (OVERRIDES §8 C2 style) and doesn't contradict the dial |

## 1. Hero, calls to action and the download notice

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-HERO-1 | "A little help, right here." | `src/Pet.vue@v1.0.1:692` (the quick chat's subtitle) | V. Used as the H1, the final card and the OG line |
| C-HERO-2 | (review) Pebble is a small, free, open-source AI companion that lives on your Mac's screen. Click it to chat, or open the full window to work in a project under your review, read the web, keep memory you control and build small interactive views. | OVERRIDES §7 and STATUS 23:32 ("What Pebble is": "…open the full window to work in a project, read the web, keep memory you control, and build small interactive views"); `README.md@207ec74:9-10`; `README.md@v1.0.1:3-6` ("A small animated pebble stays on your screen; click it to chat, or open the full window …; have Pebble read, edit and test a project folder under your review"); free and open source: `README.md@v1.0.1:12` (Apache License 2.0), STATUS §Release facts ("Licences") | Q. "Free": the project has no price (U1 §1.5) and is Apache-2.0 |
| C-HERO-3 | Free and open source · Apache-2.0 · Macs with Apple silicon (M1 or later) · macOS 12 or later (also "Free and open source, for Macs with Apple silicon.") | `README.md@v1.0.1:12`, `:17` | Q |
| C-HERO-4 | The pebble on this page uses the same animation engine as the app. | `NOTICE.md@v1.0.1:22-26` (bloub is the app's engine, vendored in `src/vendor/bloub/`); PLAN D5, §4.1 (the site copies that engine into `shared/pebble/`) | I. True once Lane B ships `shared/pebble/` from the Pebble copy |
| C-HERO-5 | Pebble is for Macs with Apple silicon. | `README.md@v1.0.1:3` | Q |
| C-DL-1 | Pebble is not notarized, so the first time you open it, macOS may say it cannot verify the app. | `README.md@v1.0.1:57-58` | Q |
| C-DL-2 | Allow Pebble alone: Control-click `Pebble.app`, choose Open, then Open again; on recent macOS versions, System Settings › Privacy & Security › Open Anyway. | `README.md@v1.0.1:58-60` | Q |
| C-DL-3 | Never turn Gatekeeper off. | `README.md@v1.0.1:60`; `docs/USER_GUIDE.md@v1.0.1:258-259` | Q |
| C-DL-4 | The one-line installer checks the download's SHA-256 and the app's signature for you. | `README.md@v1.0.1:28-31` | Q |

## 2. Film (section and /film page)

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-FILM-1 | A short film with music and no voiceover: one small bug fix, from a question to a tested change, then a quick tour. | PLAN §5.1 (one spine: the "31st of the month" bug in invoice-kit; no voiceover; music) | I. Lane E confirms against `docs/FILM_SPEC.md`. Sample data |

Film on-screen text and transcript (`chapters.ts`; draft, Lane E reconciles with the cut):

| ID | On-screen line | Source | Kind / notes |
|---|---|---|---|
| C-CH-1 | "Did it run the tests?" · "What did it change?" · "Can I undo it?" | OVERRIDES §2 (the tension beat must be neutral questions; these are its examples) | Not a claim: questions about any AI helper. No competitor, no comparison |
| C-CH-2 | "A small companion for your Mac" | `README.md@v1.0.1:3` ("a desktop companion for Macs … A small animated pebble") | Q |
| C-CH-3 | "It reads your project" | `README.md@v1.0.1:109` ("Connect a folder and Pebble can read it") | Q |
| C-CH-4 | "Review, apply, undo" | `src/App.vue@v1.0.1:2565` (Apply edit), `:2588` (Undo this edit); `docs/USER_GUIDE.md@v1.0.1:109` | Q. Avoids the mode-dependent "every edit" (PLAN §5.1) |
| C-CH-5 | "Tests run in an isolated copy" | `docs/USER_GUIDE.md@v1.0.1:111`; `README.md@v1.0.1:110` | Q |
| C-CH-6 | (1.0.3) **Withdrawn:** "Done means tested" (also the chapter's title). The film lane replaces the line with "Evidence before done" | Withdrawn by `CHANGELOG.md@checkout:50` ("**AgentGuard** holds changed code only when tests cover it"), `docs/USER_GUIDE.md@checkout:121-123` ("Changed code without covering tests is not held."). The new line: the README's AgentGuard heading (C-AG-5, `README.md@207ec74:107`); STATUS 15:25 (the landing session's proposal; the release session's confirmation was still requested) | The old line said any changed code is tested before "done". The line lives in the film lane's files (`chapters.ts`, `filmCaptions.ts`, `docs/film-captions.json`, `video/`), which this register doesn't change; the film is re-rendered after the release session's trial |
| C-CH-7 | "Your model, your choice" | `README.md@v1.0.1:76-82` (three ways to connect a model) | Q |
| C-CH-8 | "Even one on your Mac" | `README.md@v1.0.1:81` | Q |
| C-CH-9 | "You set what it may do" | `docs/USER_GUIDE.md@v1.0.1:82-94`; `README.md@v1.0.1:112-113` | Q |
| C-CH-10 | "Memory you can read and forget" | `docs/USER_GUIDE.md@v1.0.1:139-163` | Q |
| C-CH-11 | "Views, not just text" | `README.md@v1.0.1:118` | Q |
| C-CH-12 | (review) "Free and open source" · "Apache-2.0" (two lines; FILM_SPEC T15, T15s) | `README.md@v1.0.1:12` | Q |
| C-CH-13 | "No telemetry" | `README.md@v1.0.1:136` | Q |
| C-CH-14 | "Your keys stay in your Keychain" | `README.md@v1.0.1:83-84`, `:129-130` | Q |
| C-CH-15 | "Free for Macs with Apple silicon" | `README.md@v1.0.1:3`, `:12` | Q |
| C-CH-16 | (review) "An agent shouldn't grade its own work" (FILM_SPEC T4) | OVERRIDES §2 (the one allowed comparative framing, as intent, in this paraphrase); STATUS 23:32 | Intent, not a claim; no competitor named, no measure |
| C-CH-17 | (review) "AgentGuard checks the evidence" (FILM_SPEC T8) | `docs/USER_GUIDE.md@v1.0.1:120`, `:123` ("AgentGuard checks evidence") | Q |
| — | (review) "Pebble's character engine: bloub by Jérémy Perret (MIT)" on the end card (T22) | OVERRIDES §2 | Required credit |

Transcript descriptions (what you see) follow the cut in `docs/FILM_SPEC.md` §18 (applied 2026-10-23 by the claims
review): every string they quote is the real interface or the engine's verbatim text (FILM_SPEC §6, §7), with
fixture numbers (S). The withdrawn test counter and "network off" (critic C3) are gone.

(§12, 2026-10-23) No on-screen line, caption (`docs/film-captions.json`) or transcript description is affected by the
release session's corrections: the film shows no export, no Chrome, no schedule, no ⌘+ or ⌘−, never says memories are
edited ("Memory you can read and forget") and never scopes the model to a conversation ("Your model, your choice").
S6b (f1332–1439) shows the real 1.0.1 Settings › Permissions, whose Full access text names "browser and app-window
actions" (C-EXP-4..7): Pebble's own words, kept like the page's dial. (1.0.4, lane shots) The film's stills in
`video/public/ui/` are retaken from 1.0.4, so the next render of S6b shows 1.0.4's words ("presses in a Chrome tab"),
the same as the page's dial.

(1.0.3, 2026-10-23) The changelog's 1.0.3 "Corrections" withdraw one film line: "Done means tested" (C-CH-6), which
the film lane changes to "Evidence before done". The same words are the chapter's title in `chapters.ts`, which /film
and the page's chapter chips (their accessible names) show, so the title needs the same change. The proof sequence
itself stays true: the demo project has tests that cover the change (`tests/test_dates.py`, `fixtures.js`
`HELD_COVERING`), so its run is held until they pass.

## 3. On your desktop

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-DESK-1 | A small animated pebble stays on top of your other windows and joins every Space. Drag it to move it. Click it for a quick chat, or use its arrow to open the full window. | `docs/USER_GUIDE.md@v1.0.1:26-27` | Q |
| C-DESK-2 | ⌘⇧Space brings Pebble forward from any app. | `docs/USER_GUIDE.md@v1.0.1:33`, `:241` | Q |
| C-DESK-3 | Its expression follows what Pebble is doing, such as reading, writing, testing or waiting, without asking the model anything. | `docs/USER_GUIDE.md@v1.0.1:27-28` | Q |
| C-DESK-4 | Close the main window and the pebble stays on screen. Quit Pebble stops it, and the model with it. | `docs/USER_GUIDE.md@v1.0.1:32` | Q |
| C-DESK-5 | Reduce motion, in Pebble's Settings or in macOS, keeps it still. | `docs/USER_GUIDE.md@v1.0.1:28`; `src/App.vue@v1.0.1:2806-2807` ("Reduce motion" / "Keep the companion still") | Q |

## 4. Your model

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-MOD-1 | (§12) Connect a model in Settings › Models. One model runs at a time: switch it or its effort at any time, and the choice applies to every conversation. | `README.md@v1.0.1:76`; `docs/USER_GUIDE.md@v1.0.1:62-63` (Settings › Models; one model at a time). Switch at any time, every conversation: STATUS 14:58 ("Models: 'switch at any time', not 'per conversation'; the choice applies to every conversation."); OVERRIDES §12; `CHANGELOG.md@checkout:48` ("The model you choose applies to every conversation, not to one."); `docs/USER_GUIDE.md@checkout:63-64` ("Pick the model and its effort in the composer; the choice applies to every conversation until you change it. One model runs at a time."); `README.md@checkout:73` ("Switch at any time; the choice applies to every conversation.") | Q. Withdrawn: "you pick the model and its effort for each message" (from `docs/USER_GUIDE.md@v1.0.1:62`), which read as a choice scoped to one message or conversation |
| C-MOD-2 | Continue with ChatGPT: sign in with your ChatGPT account in your browser. | `README.md@v1.0.1:77`; label `src/components/AdvancedSettings.vue@v1.0.1:1171` | Q, V (label) |
| C-MOD-3 | Needs an eligible Plus or Pro plan through OpenAI's preview for open-source and approved clients. Plan limits apply, and API billing is separate. | `README.md@v1.0.1:77-78`; `src/components/AdvancedSettings.vue@v1.0.1:1186-1188` | Q. Keeps "eligible Plus or Pro" (§9.3) |
| C-MOD-4 | Connect provider: an API key for an OpenAI-compatible service, such as OpenAI, Ollama or LM Studio, an Anthropic key, or a Responses API endpoint. Keys are kept in the macOS Keychain. | `README.md@v1.0.1:79-80`; `docs/USER_GUIDE.md@v1.0.1:69-71`; label `AdvancedSettings.vue@v1.0.1:1156`, choices `:1203-1207` | Q, V (label) |
| C-MOD-5 | (review) Your message goes to that provider, with the context Pebble sends with it, such as the recent conversation and the memories Pebble recalls for it. | `docs/USER_GUIDE.md@v1.0.1:76`; `src/App.vue@v1.0.1:2872-2875` ("a cloud model such as ChatGPT receives each request, with the recent conversation and the memories Pebble recalls for it"); OVERRIDES §8 C1 | Q. "such as" keeps the list open: attachments and what tools read are context too |
| C-MOD-6 | Add a model file: run a GGUF model on your Mac with the bundled llama.cpp. Replies are made on this Mac. | `README.md@v1.0.1:81`; `src/App.vue@v1.0.1:1898` ("Replies are made on this Mac."); label `AdvancedSettings.vue@v1.0.1:1150` | Q, V |
| C-MOD-7 | Pebble downloads no model by itself: you choose the file. Local models read text only. | `README.md@v1.0.1:81`; `docs/USER_GUIDE.md@v1.0.1:48-49`, `:269`; `docs/MODEL_SELECTION.md@v1.0.1:40` | Q |
| C-MOD-8 | With a local model, the conversation stays on your Mac. | `README.md@v1.0.1:133-134` | Q (verbatim) |
| C-MOD-9 | A conversation you had with a local model is not sent to a cloud model unless you review and release it. | `README.md@v1.0.1:134-135`; `docs/USER_GUIDE.md@v1.0.1:76-78` | Q (verbatim) |

## 5. Works in your project, and AgentGuard

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-PROJ-1 | In the default mode, every edit, test run, terminal command and Git change is a card you approve. | `src/permissionModes.ts@v1.0.1:21-24` (Ask for approval always asks "Every edit, test run, terminal command, app launch, Git change and connector call."); `README.md@v1.0.1:112` ("(the default)"); `docs/USER_GUIDE.md@v1.0.1:100` ("Approvals are cards in the main window.") | Q. Keeps "In the default mode" (§9.3) |
| C-PROJ-2 | Connect a project to give Pebble one folder. Paths outside it, links that leave it, `.git` internals and credential files are refused. | `docs/USER_GUIDE.md@v1.0.1:107-108` | Q |
| C-PROJ-3 | (review) (01) Title: "In the default mode, every edit is a card you approve, with Undo." Body: Each card shows the exact change. Choose Apply edit or Don't allow. After you apply it, Undo this edit puts the file back. | `docs/USER_GUIDE.md@v1.0.1:109`; `src/permissionModes.ts@v1.0.1:21-24` (only Ask for approval asks for every edit); labels `src/App.vue@v1.0.1:2553`, `:2565`, `:2588` | Q, V (labels). The title carries the mode qualifier itself (OVERRIDES §8 C2): in Auto in project and Full access, edits run without asking |
| C-PROJ-4 | Pebble refuses to apply an edit if the file changed since it read it. | `docs/USER_GUIDE.md@v1.0.1:109-110` | Q |
| C-PROJ-5 | (02) Your project files don't change. Tests run in a filtered temporary copy of the project, without network access. Pebble recognises common test setups, such as Python, Node, Go and Cargo. | `src/App.vue@v1.0.1:728` ("Your project files don't change."); `docs/USER_GUIDE.md@v1.0.1:111-113` | V, Q |
| C-PROJ-6 | It asks before preparing a project's dependencies. | `docs/USER_GUIDE.md@v1.0.1:112-113` | Q |
| C-PROJ-7 | (03) In the default mode, each terminal command and Git change waits for your approval. Commands run without a shell, confined to the project by macOS's sandbox, with a time and output limit. Git changes arrive as a plan you approve. | `src/permissionModes.ts@v1.0.1:24`; `docs/USER_GUIDE.md@v1.0.1:114-117` | Q |
| C-PROJ-8 | (review) (03) Title: "Terminal commands beyond a short read-only list, and Git changes that delete or publish work, always wait for your review." Limit: Pebble can't undo a command. | Title: `src/permissionModes.ts@v1.0.1:20-38` (Ask asks for every terminal command and Git change; Auto and Full run only the short read-only list without asking, and both always ask for Git changes that delete or publish work); `docs/USER_GUIDE.md@v1.0.1:84-90`, `:117`. Limit: `src/App.vue@v1.0.1:731` | D (true in every mode; OVERRIDES §8 C2 wording), V. The old title "Commands and Git changes wait for review." was false in Auto and Full |
| C-PROJ-9 | (1.0.3) (04) Title: "Tests that cover a change must pass." Body: Before Pebble calls a task finished, tests that cover the code it changed must have passed since the change, and written JSON and CSV files must parse. When the evidence is missing, the task is held at "verification required", and you choose what happens next. Limit, first sentence: Changed code without covering tests is not held. | `CHANGELOG.md@checkout:50` ("**AgentGuard** holds changed code only when tests cover it"); `docs/USER_GUIDE.md@checkout:121-124` ("when tests cover the code a task changed, they must have passed since the change, and written JSON or CSV files must parse. Changed code without covering tests is not held. When the evidence is missing, the task is held at "verification required" …"). 1.0.1 behaves so: `backend/vendor/agentguard/verify/completion_gate.py@v1.0.1:9-18` (it holds the turn only for changed files that no longer parse, tests that failed, or "code changed, the project has tests covering it, and nothing was run"; "Everything else passes silently"), `:178-184` ("no existing tests cover the changed files": it "does not hold the turn open"); `backend/pebble/guard.py@v1.0.1:748-751` (changed code with no passing run and no hold: outcome `not_verified`) | Q. Withdrawn: the title "Done means tested." and "A task that changed code must have a passing test run of those changes" (`docs/USER_GUIDE.md@v1.0.1:120-121`), which said any changed code is held until tests pass |
| C-PROJ-10 | AgentGuard checks evidence; it is not a security layer. (1.0.3: now the limit's second sentence, after C-PROJ-9's "Changed code without covering tests is not held.") | `docs/USER_GUIDE.md@v1.0.1:123`; `docs/USER_GUIDE.md@checkout:125` | Q (verbatim) |
| C-AG-1 | AgentGuard reads the evidence before Pebble calls a task finished. Its one-line result says which tests ran and whether they passed on the current files. | `docs/USER_GUIDE.md@v1.0.1:120`; `backend/pebble/run_activity.py@v1.0.1:49-62` (the one-line verdict "Verified · {runner} {passed} passed on current files") | Q, D |
| C-AG-2 | "Verified · pytest 42 passed on current files" | Format: `backend/pebble/run_activity.py@v1.0.1:62`; numbers: `fixtures.js` (`run-fix-2`) | V format, S numbers |
| C-AG-3 | "Pebble's change isn't verified yet." · Run the tests · Ask Pebble to finish · Accept as unverified · "Keep this change without verification? Pebble records that you decided." | `src/components/RunPanel.vue@v1.0.1:57`, `:121-127` | V |
| C-AG-4 | "Not verified · 1 changed file, no tests run" · "Not verified · pytest 2 failed" · "Not verified · a changed file doesn't parse" · "Not verified · tests ran before the last change" | `backend/pebble/run_activity.py@v1.0.1:58`, `:66-72` | V format, S numbers |

## Interactive explainers (labelled "Interactive example")

| ID | What | Source | Kind / notes |
|---|---|---|---|
| C-EXP-1 | Approval card words: "Needs your review", "Done", "Not allowed", "Undone"; "Changes this file in your project. You can undo it afterwards."; "Proposed source edit · original stays intact until approval"; "View diff"; "Don't allow"; "Apply edit"; "Undo this edit" | `src/App.vue@v1.0.1:718`, `:726`, `:2492-2495`, `:2498`, `:2553`, `:2565`, `:2588` | V. "Not allowed" is the app's own status after Don't allow (`:718`), so the demo shows it instead of inventing copy (§7.3) |
| C-EXP-2 | `invoice_kit/dates.py` and its diff | `fixtures.js` (`DIFF_DATES`) | S |
| C-EXP-3 | "Try the approval card. Its words are the ones Pebble shows." | C-EXP-1 (checked word for word by Lane A's script, see "Checks run") | I |
| C-EXP-4..7 | The three modes' names, "Runs without asking" and "Always asks" texts, and the "In every mode, …" sentence | (1.0.4) `src/permissionModes.ts@v1.0.4:20-38`, `:42`; labels `AdvancedSettings.vue@v1.0.4:1383-1384`; legend "How Pebble acts" from `AdvancedSettings.vue@v1.0.4:1365` ("HOW PEBBLE ACTS", set in sentence case per PLAN §7.1). Before: the same lines `@v1.0.1` | V. The app keeps these true with a test (`permissionModes.ts:1-5`). (1.0.4, lane shots) Switched to 1.0.4's words with the Settings › Permissions stills retaken from 1.0.4 (`public/ui/v1/settings-permissions-*`): Full access's "Always asks" now names "presses in a Chrome tab" (`permissionModes.ts@v1.0.4:36`), and the "In every mode" sentence reads "… Connector calls, installs and every press in a Chrome tab you granted always ask; looking, typing and choosing in that tab run under your grant. Protected credentials stay blocked." (`:42`); the app's own test asserts "no app-window wording" (`src/permissionModes.test.mjs@v1.0.4:60`). The other names and texts are unchanged since 1.0.1. (§12, history) 1.0.1's two strings named "browser and app-window actions" (`permissionModes.ts@v1.0.1:36`, `:42`) and were shown word for word until 1.0.4 was published (STATUS 20:34). C-EXP-14 stays under the quote |
| C-EXP-8 | "The default" (on Ask for approval) | `README.md@v1.0.1:112`; `src/permissionModes.ts@v1.0.1:44-46` | Q |
| C-EXP-9 | Below the modes, in Settings › Permissions, a switch for each kind of tool turns it off entirely. | `docs/USER_GUIDE.md@v1.0.1:92-94` | Q. Explains the app sentence's "switches below" on a page that has none |
| C-EXP-10 | "Full access increases the impact of mistakes and prompt injection. AgentGuard is a reliability check; it cannot guarantee that every command or answer is safe." | `src/components/AdvancedSettings.vue@v1.0.1:1389-1393` (shown when Full access is selected) | V. Allow-listed (contains "safe") |
| C-EXP-11 | Forget card: "Saved memories about “…”"; "Nothing is forgotten until you choose Forget. These are records Pebble saved; forgetting one removes it for good."; "Forget"; "Forgotten"; "All memories in Settings"; "Done"; the aria label "Forget: …" | `src/App.vue@v1.0.1:2057`, `:2059`, `:2066`, `:2071`, `:2075`, `:2081-2082` | V |
| C-EXP-12 | "In this project" (where a memory applies) | `src/App.vue@v1.0.1:1479` | V |
| C-EXP-13 | The three memories and the request "Forget what you know about invoice-kit." | `fixtures.js` (`mem-pref-4`, `mem-fact-1`, `mem-proc-1`) | S |
| C-EXP-14 | (§12, new) Under the quoted "In every mode, …" sentence (`explainers.permissionDial.appsNote`, rendered by `Pace.tsx`): "Pebble can't see or operate other apps yet: an app launch only opens one." | The sources of C-LIM-15: STATUS 14:58; OVERRIDES §12; `CHANGELOG.md@checkout:38-39`; `backend/pebble/app.py@checkout:159`, `:3181-3189`; `src/components/ScreenSessions.vue@checkout:13-14`; `backend/pebble/native_apps.py@checkout:15-16` | Q, D. Kept 1.0.1's verbatim "app-window actions" (C-EXP-4..7) from reading as app control. (1.0.4) The dial's words no longer name app windows, but all three modes still list app launches ("app launch", "app launches"), so the note still says what a launch is; true for 1.0.4 (STATUS 20:34: the 14:58 corrections hold). Says nothing about approval, because the dial above it shows when an app launch asks in each mode |

## 6. You set the pace

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-PACE-1 | Pick one of three modes in Settings › Permissions. Each one says plainly what runs without asking and what always asks. | `docs/USER_GUIDE.md@v1.0.1:82-90`; `src/permissionModes.ts@v1.0.1:1-6` | Q |
| C-PACE-2 | Approvals happen only in Pebble's main window. | `README.md@v1.0.1:8-9`, `:113`; `SECURITY.md@v1.0.1:50`; `docs/USER_GUIDE.md@v1.0.1:29-30` | Q. Doc wording, **not** an interface string (PLAN §9.3 calls it one; the app has no such line) |
| C-PACE-3 | A task keeps the permissions it started with: a running task can never gain access. | `docs/USER_GUIDE.md@v1.0.1:98-99` | Q |
| C-PACE-4 | The pebble, a generated view, a file, a web page, a memory or a skill can never approve anything or widen a permission. | `docs/USER_GUIDE.md@v1.0.1:100-101` | Q (verbatim) |

## 7. Memory and Views

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-MEM-1 | Six kinds of memory, each with its own switch: Your preferences, Facts & knowledge, Procedures, Past experiences, Time-sensitive information and Working context. (F2b: the section's lead now reads "Pebble keeps six kinds of memory on your Mac, each with its own switch in Settings › Memory, where you can see, search and forget every one."; the six names follow it as a list, C-MEM-7) | `docs/USER_GUIDE.md@v1.0.1:139-148`, `:152-153`; `docs/DATA_FOLDERS.md@v1.0.1:21`; `README.md@207ec74:181` ("Six layers, on your Mac"); C-PRIV-1, C-MEM-2 | Q |
| C-MEM-2 | See and search every memory in Settings › Memory, with where it came from. Forget one, or all of them. | `docs/USER_GUIDE.md@v1.0.1:152-153`; `AdvancedSettings.vue@v1.0.1:1484`, `:1549` | Q |
| C-MEM-3 | (1.0.3) Start a message with "Remember that …" to save something right away: a preference when it is about you, otherwise a fact. Pebble still answers the rest. | `CHANGELOG.md@checkout:45-46` (""Remember that …" saves a preference when it is about you, and a fact otherwise."); `docs/USER_GUIDE.md@checkout:152-153` ("saves it right away: as a preference when it is about you (I, my, me), otherwise as a fact. The rest of the message is still answered."); `README.md@checkout:228` | Q. Withdrawn: "to save a preference" (`docs/USER_GUIDE.md@v1.0.1:150`, "saves a preference right away"), which said every such message becomes a preference |
| C-MEM-4 | Ask Pebble to forget something and it shows the memories that match. Nothing is forgotten until you confirm it in the main window. | `docs/USER_GUIDE.md@v1.0.1:155-156`; `CHANGELOG.md@v1.0.1:34` | Q |
| C-MEM-5 | (1.0.3) Write what Pebble should know about you in `~/.pebble/PEBBLE.md`, in your own words. Pebble follows it as your standing instructions, and it never grants a permission. | `CHANGELOG.md@checkout:46` ("Pebble follows `PEBBLE.md` as your standing instructions; other memories are data."); `docs/USER_GUIDE.md@checkout:160-161` (verbatim but for "it"); `README.md@checkout:235-237` ("`PEBBLE.md`, which you write, is the exception"). 1.0.1 does so: `backend/pebble/runner.py@v1.0.1:382` ("HOST STANDING INSTRUCTIONS: the person's PEBBLE.md, their own words. Follow them as their standing …"), `:983-987` (sent whole in its own message, "not again inside the recall pack") | Q. Withdrawn: "It is information about you, never a permission" (`docs/USER_GUIDE.md@v1.0.1:158`, "read like your preferences: information about you"), which, under the recall rule (C-MEM-8), read as data rather than instructions |
| C-MEM-6 | One switch, Remember useful context, turns memory off. Forgetting removes a memory for good. | `docs/USER_GUIDE.md@v1.0.1:162`; `src/App.vue@v1.0.1:2059` ("forgetting one removes it for good") | Q |
| C-MEM-10 | (§12, new; `llms.txt`) Six kinds of memory. You can see, search, add and forget memories, but not edit them; the only thing you edit is `~/.pebble/PEBBLE.md`. One switch turns memory off. | STATUS 14:58 ("Memory: 'add or forget', not 'edit'. The only thing you edit is PEBBLE.md."); OVERRIDES §12 (overrides §10's "see, search, edit (`~/.pebble/PEBBLE.md`)"); `CHANGELOG.md@checkout:44` ("No memory can be edited: you can add, view and forget memories, and write `PEBBLE.md`."); `docs/USER_GUIDE.md@checkout:152-162`; C-MEM-1, C-MEM-2, C-MEM-3, C-MEM-5, C-MEM-6 | Q. Replaces "six kinds of memory you can see, search, edit in ~/.pebble/PEBBLE.md and forget", which read as editing memories. The page's own memory section never said "edit" |
| C-VIEW-1 | Ask for a dashboard, a table, a chart, a plan, a diagram, a quiz or an app demo. Pebble builds it as a view in the conversation, from data, and keeps its earlier versions. | `docs/USER_GUIDE.md@v1.0.1:167-168` | Q |
| C-VIEW-2 | A quiz keeps its timer and your answers. | `docs/USER_GUIDE.md@v1.0.1:169` | Q |
| C-VIEW-3 | (§12) Export a view as Word, Excel, CSV or HTML. Saving always goes through the macOS Save dialog, and nothing is uploaded. | `docs/USER_GUIDE.md@v1.0.1:171-172` (Save dialog, nothing uploaded). The formats: STATUS 14:58 ("PDF export: remove it. A release build could never make the file. Exports are Word, Excel, CSV and HTML."); OVERRIDES §12; `CHANGELOG.md@checkout:27-29`, `:37`; `docs/USER_GUIDE.md@checkout:174-176`; `src/components/ExportPanel.vue@checkout:19-24` (the four formats: HTML, DOCX, XLSX, CSV; "Phase 30 (D42): no PDF"); `src/slashCommands.ts@checkout:173-174` (`EXPORT_FORMATS = ["docx", "xlsx", "csv", "html"]`); `backend/pebble/runtime_commands.py@checkout:43` | Q. Withdrawn: "PDF" (1.0.1's export panel offered it first, but a release build could never make the file). (1.0.3, checked and kept) "A Word file turns tables into paragraphs and is labelled unverified" (`CHANGELOG.md@checkout:55`; `docs/USER_GUIDE.md@checkout:174-176`, which keeps "Saving always goes through the macOS Save dialog, and nothing is uploaded."): the sentence says only that a view can be exported as Word, which stays true |
| C-VIEW-4 | A view can show and collect things, but it can never approve, run or change anything. | `README.md@v1.0.1:118-119` | Q (verbatim) |

## 8. And a little more

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-MORE-1 | Pebble reads public pages as text; their scripts never run. Searches send your search words to Microsoft Bing's RSS results feed. | `docs/USER_GUIDE.md@v1.0.1:127-128` | Q |
| C-MORE-2 | Everything read from the web is untrusted data: a page can never give Pebble an instruction or a permission. | `docs/USER_GUIDE.md@v1.0.1:132-133` | Q |
| C-MORE-3 | (1.0.3; the `more` tile, not rendered) Pebble can hand parts of a larger task to agents, track a goal with criteria, and run reviewed schedules. Agents read and propose (a worktree agent writes only in its own copy); only the main task changes your project, through your normal review. | `docs/USER_GUIDE.md@v1.0.1:176-181`; `README.md@v1.0.1:120-121`. (1.0.3) `CHANGELOG.md@checkout:51-52` ("**Agents** never change your project, run commands or call connectors themselves; a worktree agent writes in its own copy."); `docs/USER_GUIDE.md@checkout:181-182` ("Agents read and propose (an agent in its own worktree writes only in that copy); only the main task changes your project, through your normal review.") | Q. Was 1.0.1's "Agents read and propose; only the main task applies changes" (`docs/USER_GUIDE.md@v1.0.1:177-178`), which the 1.0.3 guide rewrote |
| C-MORE-4 | Skills (reusable instructions in Markdown) and connectors (MCP servers over HTTP). Each one starts turned off until you review it. | `docs/USER_GUIDE.md@v1.0.1:187-192` | Q |
| C-MORE-5 | Every connector call asks for your approval. Servers started through npx, uvx or Node aren't supported yet. | `docs/USER_GUIDE.md@v1.0.1:192-193` | Q |
| C-MORE-6 | (§12) The `more` tile (not rendered: lane F2b replaced the tiles with `orchestration` and `tour`): Pebble can look at and act in one Chrome tab you share and then grant, on that tab's site, for up to 30 minutes. It can't open, close, list or switch tabs, or leave the site. Every press asks first, and pages that look like sign-in, password or payment pages are handed back to you unread. The tour's short sentence (rendered, unchanged): "Share a Chrome tab and Pebble can look at it and act in it, one site at a time, with your grant." | `README.md@v1.0.1:123`; `docs/USER_GUIDE.md@v1.0.1:200`, `:216` ("Grant it for 5, 15 or 30 minutes"), `:221`. (§12) STATUS 14:58 ("one Chrome tab you share and then grant, on one site, for up to 30 minutes. It can't open, close, list or switch tabs, or leave the site. Every press asks first." and "`copy.ts:805`'s sentence is fine as it is: keep 'share', 'one site' and 'your grant'"); OVERRIDES §12; `CHANGELOG.md@checkout:40-43`; `docs/USER_GUIDE.md@checkout:206-208`, `:224`, `:229-230` ("Pages that look like sign-in, password, payment or verification pages are handed back to you unread. Every press, and Enter, waits for your approval"); `backend/pebble/screen_session.py@checkout:62` (`MAX_TTL_SECONDS = 1800`); `browser-extension/lib/worker.mjs@checkout:137` (at most 1,800 s); `src/permissionModes.ts@checkout:42` | Q. "Pages that look like …": the 1.0.3 guide's own softening of 1.0.1's "are always handed back". The simulated-Chrome caveat is C-LIM-10, in the tile's limit line. Never compared with agents that "control your browser" (OVERRIDES §12) |
| C-MORE-7 | ⌘. stops a task, and nothing Pebble already did is replayed when you continue. Rewind files puts back the files a task changed. | `docs/USER_GUIDE.md@v1.0.1:44`, `:118` | Q |
| C-MORE-8 | Rewind files skips files that changed since, and lists what it can't undo, such as commands that ran. | `docs/USER_GUIDE.md@v1.0.1:118-119` | Q |

## 9. Private by default: stored on your Mac, and what leaves it

The H2 "Private by default." is the release session's wording (OVERRIDES §7) and is allowed only with the two columns
beside it: "Stored on your Mac" (never "Stays on your Mac") and "What leaves your Mac" with five destinations
(OVERRIDES §8 C1).

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-PRIV-1 | Your conversations and memories are stored on your Mac. | `src/App.vue@v1.0.1:2872` ("…stored on this Mac.") | V (this Mac → your Mac) |
| C-PRIV-2 | `~/.pebble` holds Pebble's database, settings, `PEBBLE.md` and logs. | `README.md@v1.0.1:128` | Q |
| C-PRIV-3 | `~/Documents/Pebble` holds readable copies of your conversations, memories and files, which you can turn off. | `README.md@v1.0.1:128-129` | Q |
| C-PRIV-4 | Passwords, keys and sign-ins stay in the macOS Keychain. | `README.md@v1.0.1:129-130` | Q |
| C-PRIV-5 | No telemetry. Pebble sends no analytics. Optional usage counters are off by default, stay on your Mac, and can be exported or cleared. | `README.md@v1.0.1:136-137` | Q (verbatim) |
| C-PRIV-6 | (review) The model provider you chose. With a cloud model, it receives your message and the context Pebble sends with it, such as the recent conversation and the memories Pebble recalls for it. | `README.md@v1.0.1:132-133`; `src/App.vue@v1.0.1:2872-2875`; OVERRIDES §8 C1 | Q |
| C-PRIV-7 | Your search words, to Microsoft Bing's RSS results feed. | `README.md@v1.0.1:114`, `:133` | Q |
| C-PRIV-8 | (review) The web pages Pebble reads for you, fetched from their own sites. | `docs/USER_GUIDE.md@v1.0.1:127` ("Pages Pebble reads are fetched from their own sites"); `README.md@v1.0.1:114-115`, `:133` | Q. "reads for you", not "you ask for": the model also reads pages on its own during a task, and web search and reading run without a prompt while their switch is on (C-PRIV-10) |
| C-PRIV-9 | Calls to connectors you add. | `README.md@v1.0.1:133` | Q |
| C-PRIV-10 | In every mode, searching and reading the web run without asking while that switch is on. Turn it off with Search and read the web in Settings › Permissions. | `src/permissionModes.ts@v1.0.1:42`; `docs/USER_GUIDE.md@v1.0.1:135` | Q |
| C-PRIV-11 | Pebble's own tools can never read or change `~/.pebble` or `~/Documents/Pebble`, even when your project contains them. | `README.md@v1.0.1:138` | Q (verbatim) |
| C-PRIV-12 | (review) Weather lookups, to Open-Meteo. (Diagram: "Open-Meteo", "weather lookups".) | `README.md@v1.0.1:115`, `:133`; `docs/USER_GUIDE.md@v1.0.1:131`; `NOTICE.md@v1.0.1:59-60` | Q. The fifth destination (OVERRIDES §8 C1) |

## 10. Install

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-INST-1 | One line in Terminal, or the zip by hand. Both install the same app from the GitHub release. | `README.md@v1.0.1:28` (the installer downloads `Pebble-macos-arm64.zip` from the latest release), `:53` | Q |
| C-INST-2 | Apple silicon (M1 or later); macOS 12 or later. Pebble 1.0 was built and tested on macOS 27. | `README.md@v1.0.1:17` | Q (verbatim) |
| C-INST-3 | Free. A cloud model's costs depend on your provider. | `README.md@v1.0.1:12` (Apache-2.0), `:77-78` (plan limits; API billing separate); U1 §1.5 ("A price" row) | Q |
| C-INST-4 | Runs only on macOS on Apple silicon, not under Rosetta. | `README.md@v1.0.1:27` | Q |
| C-INST-5 | Downloads the zip and `SHA256SUMS` from the latest GitHub release over HTTPS, and checks the zip's SHA-256. | `README.md@v1.0.1:28-29` | Q |
| C-INST-6 | Checks the app's identifier, version and code signature before it changes anything. | `README.md@v1.0.1:30-31` | Q |
| C-INST-7 | Moves any earlier `Pebble.app` to `~/PebbleBackups`. It never deletes one. | `README.md@v1.0.1:33-34` | Q |
| C-INST-8 | Never uses `sudo`, never changes Gatekeeper and never removes quarantine flags. Never touches your data in `~/.pebble` or `~/Documents/Pebble`. | `README.md@v1.0.1:36-38` | Q |
| C-INST-9 | Options `--dry-run` (shows what it would do; nothing changes), `--version 1.0.4` (v2 sections B: the version from `releaseFacts.ts`; not rendered); read the installer first: download it, read it, run `bash install.sh`. | `README.md@v1.0.1:40-49` | Q |
| C-INST-10 | The installer downloads with curl, which doesn't quarantine files, so macOS opens Pebble without the first-run warning. | `README.md@v1.0.1:69` | Q |
| C-INST-11 | By hand: download the zip and `SHA256SUMS`; `shasum -a 256 -c SHA256SUMS` should print `Pebble-macos-arm64.zip: OK`; drag `Pebble.app` to Applications; the first-run steps. | `README.md@v1.0.1:53-60` | Q |
| C-INST-12 | The first time, with no model connected, Pebble opens its full window with a welcome: Connect your ChatGPT account, or Use a local model. After that, Pebble starts as the pebble. | `README.md@v1.0.1:73-75`; labels `src/App.vue@v1.0.1:1893`, `:1897` | Q, V |
| C-INST-13 | `--uninstall` moves `Pebble.app` to `~/PebbleBackups` and lists what Pebble keeps on your Mac. Your data is never touched. | `README.md@v1.0.1:95-100`; STATUS 23:27 (`--uninstall` "moved the app aside and deleted nothing") | Q |
| C-INST-14 | Quit Pebble and run the installer again. It keeps the previous app in `~/PebbleBackups` and leaves your data where it is. Pebble 1.0 doesn't check for updates by itself. | `README.md@v1.0.1:88-91` | Q |

## 11. Open source and FAQ

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-OSS-1 | Pebble's code is on GitHub under the Apache License 2.0. Read it, build it yourself from a clean clone, or help improve it. | `README.md@v1.0.1:12`, `:142`; STATUS 23:27 (source pushed to `main`) | Q |
| C-OSS-2 | (v2 sections B) Before release, Pebble 1.0.4 passed 8,653 automated tests and 1,840 service checks. The tests never call a model or the network. (`openSource.tested`, not rendered) | STATUS 20:34 ("Numbers: "8,653 tests" and "1,840 service checks across 45 suites""); OVERRIDES §16; `README.md@26d7b19:98`, `:358-359`; `CONTRIBUTING.md@v1.0.1:50` | Q. The counts come from `releaseFacts.ts`. Was 8,421 and 1,772 (1.0.1) |
| C-OSS-3 | Pebble is maintained by one person. Please allow time for a reply. | `SECURITY.md@v1.0.1:17` | Q |
| C-FAQ-1 | Pebble is free and open source, under the Apache License 2.0. | `README.md@v1.0.1:12` | Q |
| C-FAQ-2 | (review) A cloud model's costs depend on your provider. Continue with ChatGPT needs an eligible Plus or Pro plan through OpenAI's preview, with that plan's limits, and API billing is separate. | `README.md@v1.0.1:77-78` | Q. "through OpenAI's preview" added (OVERRIDES §8 H14) |
| C-FAQ-3 | A Mac with Apple silicon (M1 or later), on macOS 12 or later. Pebble 1.0 was built and tested on macOS 27. | `README.md@v1.0.1:17` | Q |
| C-FAQ-4 | No version for Intel Macs, Windows or Linux, and the installer won't run under Rosetta. | `README.md@v1.0.1:27`, `:148`; `install.sh@v1.0.1:109-112` | Q |
| C-FAQ-5 | Signed with the project's own stable identity, not an Apple Developer ID, and not notarized by Apple. Signed, notarized installers are on the list of work still to do. | `README.md@v1.0.1:64-65`; `docs/ARCHITECTURE.md@v1.0.1:51` | Q. States no reason that the sources don't give |
| C-FAQ-6 | So the first time you open a copy downloaded in a browser, macOS may say it cannot verify the app … Never turn Gatekeeper off. | `README.md@v1.0.1:57-60` | Q |
| C-FAQ-7 | The installer downloads with curl, which doesn't quarantine files … it checks the download's SHA-256 and the app's signature. | `README.md@v1.0.1:69`, `:28-31` | Q |
| C-FAQ-8 | There are three ways in, all in Settings › Models. | `README.md@v1.0.1:76-82` | Q |
| C-FAQ-9 | Add a model file runs a GGUF model on your Mac with the bundled llama.cpp. Pebble downloads no model by itself; the project tests with Microsoft's FrogNano-4B-2609, a file of about 2.8 GB. | `README.md@v1.0.1:81-82`; `docs/MODEL_SELECTION.md@v1.0.1:8-12`; `NOTICE.md@v1.0.1:51-53` | Q. A public model, named as the tested default, "not a claim that FrogNano is the best" (`MODEL_SELECTION.md:9-10`) |
| C-FAQ-10 | Local models read text only. To work with images, use a model that can see images. | `docs/USER_GUIDE.md@v1.0.1:48-49`; `docs/MODEL_SELECTION.md@v1.0.1:40` | Q |
| C-FAQ-11 | Your conversations and memories are stored on your Mac, and your keys stay in the macOS Keychain. Pebble has no telemetry: it sends no analytics. | `src/App.vue@v1.0.1:2872`; `README.md@v1.0.1:129-130`, `:136` | Q |
| C-FAQ-12 | Yes, for chat with a model file on your Mac: its replies are made on this Mac. Web search, weather, ChatGPT and other providers need a connection. | `README.md@v1.0.1:81`; `src/App.vue@v1.0.1:1898`; `docs/MODEL_SELECTION.md@v1.0.1:59` (the local runtime listens only on 127.0.0.1); `README.md@v1.0.1:90` (no update check), `:132-133` (what goes out) | D. Nothing in the chat path with a local model needs the network. The question avoids the banned phrase "works offline" (U1 §1.5) |
| C-FAQ-13 | (1.0.3) AgentGuard is a reliability check, not a security layer … when tests cover the code the task changed, they must have passed since the change, and written JSON or CSV files must parse. Changed code without covering tests is not held. | `docs/USER_GUIDE.md@v1.0.1:120-123`, `:123` (not a security layer); `src/App.vue@v1.0.1:2876-2877`; `SECURITY.md@v1.0.1:54`. The scope: `CHANGELOG.md@checkout:50`; `docs/USER_GUIDE.md@checkout:121-123` (the evidence check and "Changed code without covering tests is not held.", nearly verbatim); 1.0.1's code as in C-PROJ-9 | Q. Withdrawn: "a task that changed code must have a passing test run of those changes" (`docs/USER_GUIDE.md@v1.0.1:120-121`) |
| C-FAQ-14 | (review) It also indexes your project, grounds each request in the files it reaches, and challenges an agent that drifts outside that scope. ("an agent that drifts", not "a step": the challenge fires only once 5 changed files fall outside the task, `backend/vendor/agentguard/core/taskstate.py` `DEFAULT_UNRELATED_LIMIT = 5`) | STATUS 23:32 (showcase brief: "It indexes your repository and grounds each request in the files the request reaches. It challenges an agent that drifts outside that scope"); `docs/ARCHITECTURE.md@v1.0.1:23` ("AgentGuard indexes a filtered mirror"), `:29` (pre-tool decisions stop a proposed project operation) | Q. Framed as reliability, never security (STATUS 23:32) |
| C-FAQ-15 | When the evidence is missing, the task is held at "verification required", and you choose: run the covering tests, ask Pebble to finish, or accept the change as not verified. | `docs/USER_GUIDE.md@v1.0.1:121-122` | Q |
| C-FAQ-16 | Protection comes from the permission mode you pick, approvals that happen only in Pebble's main window, and macOS's sandbox, which limits commands and tests but is not a promise against every attack. | `README.md@v1.0.1:8-10`, `:151-152`; `SECURITY.md@v1.0.1:50-53`; `src/App.vue@v1.0.1:2875-2877` ("Permissions and your approvals decide what Pebble may do") | Q |
| C-FAQ-17 | Quit Pebble and run the installer again … When an update changes how Pebble stores its data, Pebble backs up its database first. | `README.md@v1.0.1:88-90` | Q |
| C-FAQ-18 | Pebble 1.0 doesn't check for updates by itself. Watch the repository on GitHub: Watch › Custom › Releases. | `README.md@v1.0.1:90-91` ("watch the releases"); the GitHub menu path from PLAN §7.4 | Q |
| C-FAQ-19 | To remove everything, including your data and Keychain items, follow "Remove Pebble completely" in the data folders guide. | `README.md@v1.0.1:99-101`; `docs/DATA_FOLDERS.md@v1.0.1:114-124` | Q |
| C-FAQ-20 | An independent open-source project by Tohin Majumder, maintained by one person. Not affiliated with OpenAI, Anthropic, Apple, Google or Microsoft, or with Pebble smartwatches. | `NOTICE.md@v1.0.1:4` ("Copyright 2026 Tohin Majumder"); `SECURITY.md@v1.0.1:17`; `NOTICE.md@v1.0.1:59-61` (Bing and Open-Meteo "Neither is affiliated with Pebble"); PLAN §7.2 and U1 §1.5 (the project's own non-affiliation notice) | Q. The non-affiliation line is the publisher's own statement |
| C-FAQ-21 | For anything larger than a small fix, open an issue on GitHub first. Report security problems privately, as the security policy describes. | `CONTRIBUTING.md@v1.0.1:8-9`; `SECURITY.md@v1.0.1:5-8` | Q |

## 12. Footer, final card and the other pages

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-FOOT-1 | (review) Pebble is resting. No telemetry. | `README.md@v1.0.1:136` ("No telemetry.") | Q. "It never phones home" removed (OVERRIDES §8 H14): it had no direct source, and it could read as "nothing leaves your Mac" |
| — | "Pebble's character engine: bloub by Jérémy Perret (MIT)" | OVERRIDES §2 (exact wording); `NOTICE.md@v1.0.1:22-26`; `src/vendor/bloub/LICENSE@v1.0.1:3` | Required credit, footer + /credits + CREDITS.md |
| — | Trademark and non-affiliation lines | PLAN §7.2; U1 §1.5 | Publisher's notice |
| — | "Site code: Apache-2.0. Films and images © 2026 Tohin Majumder." | PLAN §2.1 (`LICENSE`, Apache-2.0, code only), §6.5 (media © 2026 Tohin Majumder) | Publisher's notice |
| — | Honesty stamp "This page: 0 cookies · 0 trackers · 0 third-party requests" | Computed live in the browser (PLAN §7.2 row 12, R4 §6.5 signature 9) | I. Must be computed, never hard-coded |
| C-PAGE-1 | This site sets no cookies and runs no analytics or trackers. Everything it loads, including the fonts, the images and the film, comes from this site. | PLAN D14 (self-hosted fonts), D16 (media in `public/`), D19 and §7.8 (no analytics, no cookies, CSP `default-src 'self'`) | I. Verified by `tools/qa/requests.spec.ts` (§9.2): every request same-origin, `document.cookie === ''` |
| C-PAGE-2 | The site is hosted by Vercel. To deliver the pages, Vercel's servers receive your IP address and the details of each request, as every website's servers do. | PLAN D2, §2.4 (Vercel hosting); Vercel privacy policy (`https://vercel.com/legal/privacy-policy`, HTTP 200) | Q, general fact |
| C-PAGE-3 | The Pebble app is separate from this site. It has no telemetry. | `README.md@v1.0.1:136` | Q |

## SEO, social and llms.txt

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-SEO-1 | Pebble is a free, open-source AI companion for Macs with Apple silicon. Chat with the model you choose; you decide what it may change. | `README.md@v1.0.1:3-10` ("work with a model you choose"; "Every change to your project or your Mac goes through a permission mode you pick"), `:12` | Q. 134 characters |
| C-SEO-2 | (review) `operatingSystem` "macOS 12 or later on Apple silicon (built and tested on macOS 27)"; `processorRequirements` "Apple silicon (M1 or later)" | `README.md@v1.0.1:17` | Q. The macOS floor carries its "tested on macOS 27" qualifier (OVERRIDES §8 H14), as in `llms.txt` |
| — | JSON-LD `offers` price 0, `isAccessibleForFree`, `license`, `author`, `softwareVersion`, `datePublished`; **no** `aggregateRating` or `review` | C-FAQ-1, C-FAQ-20, C-REL-1, C-REL-3; PLAN §7.8 | `downloadUrl` and `fileSize` only when Live |
| — | `llms.txt` lines | (1.0.3: the AgentGuard line's "A task that changed code must have a passing test run of those changes before Pebble calls it finished" became "Before Pebble calls a task finished, tests that cover the code it changed must have passed since the change; changed code without covering tests is not held." (C-PROJ-9)) (§12: Memory now reads "You can see, search, add and forget memories, but not edit them; the only thing you edit is ~/.pebble/PEBBLE.md" (C-MEM-10); the Limits line "Models make mistakes. Pebble for Chrome needs Chrome's Developer mode. Scheduled tasks run only while Pebble is open." became four lines: models (C-LIM-7), Pebble for Chrome at length with the simulated-Chrome caveat (C-MORE-6, C-LIM-10), other apps (C-LIM-15), schedules with where results show (C-LIM-11)) (review: adds the macOS 27 qualifier, "through OpenAI's preview", the AgentGuard evidence layer and scope challenge (C-AG-7, C-FAQ-14), the five "What leaves the Mac" destinations (C-PRIV-6..9, C-PRIV-12) and the sandbox / prompt-injection limit (C-LIM-9)) The rows above: C-HERO-2, C-MOD-2..7, C-PROJ-1, C-PROJ-9, C-PROJ-10, C-MEM-1, C-VIEW-1, C-VIEW-4, C-PRIV-*, C-LIM-*, C-REL-4; "the first public release": `CHANGELOG.md@v1.0.1:4`; "No benchmark results have been published, and Pebble makes no speed or quality comparison with other tools": STATUS §Release facts ("Benchmarks. None are published yet."), OVERRIDES §2. (v2 sections B) The version line is now "Pebble 1.0.4 came out on 23 October 2026." (C-REL-1, C-REL-3, from `releaseFacts.ts`); "the first public release" and the no-benchmark line are withdrawn: since STATUS 20:34 the benchmark is public, and while `releaseFacts.benchmarksPublic` is true a "## Benchmark" block repeats the section's own sentences (C-BENCH-1, -2, -4, -6, -7..10, -14) with the full-results link (C-BENCH-17); with the gate closed, one line says "This site makes no speed or quality comparison with other tools." | Q |

## LinkedIn post draft (`.work/social/linkedin-post.txt`, not committed)

| Claim in the post | Source |
|---|---|
| Pebble 1.0.1 is the first public release | C-REL-1; `CHANGELOG.md@v1.0.1:4` |
| A small AI companion for Macs with Apple silicon; click it to chat, or open the full window to work on a project | C-HERO-2, C-HERO-5 |
| (review) An eligible ChatGPT Plus or Pro plan (through OpenAI's preview), an API key, or a model file that runs on your Mac | C-MOD-2..7; OVERRIDES §8 H14 |
| In the default mode, every edit is a card you approve, with Undo; tests run in an isolated copy | C-PROJ-1, C-PROJ-3, C-PROJ-5 |
| (1.0.3) Before Pebble calls a coding task finished, AgentGuard checks that the tests covering the changed code have passed since the change; if no test covers it, the task isn't held. AgentGuard checks evidence; it isn't a security layer. (Was: "AgentGuard checks that tests of the changed code have passed. It checks evidence; …") | C-PROJ-9, C-PROJ-10 |
| Free and open source under the Apache License 2.0, with no telemetry | C-FAQ-1, C-PRIV-5 |
| (review) Signed with its own identity rather than an Apple Developer ID, and not notarized; Apple silicon only; no independent security audit yet | C-LIM-1, C-LIM-2, C-LIM-5, C-LIM-4 |
| (review) Links: the release page `https://github.com/tohin003/Pebble/releases/tag/v1.0.1` (OVERRIDES §4 asks for "the GitHub release") and the repository | STATUS §Release facts |
| (§12 check, 2026-10-23) The post mentions no export, app or window control, Chrome, memory editing, per-conversation model choice, schedule or ⌘+/⌘−, so nothing in it changed | OVERRIDES §12 |
| (1.0.3 check, 2026-10-23) Besides the AgentGuard line above, the post mentions no invented API, agent, "Remember that …", `PEBBLE.md`, Forget all or Word export | `CHANGELOG.md@checkout:31-57` |

## Credits

| Item | Source |
|---|---|
| bloub, MIT, "Copyright (c) 2026 Jérémy Perret", https://github.com/jeremy-prt/bloub, revision `b4bb3c1b5f93c7b87a2e8d620f667c4093d97749` | `src/vendor/bloub/LICENSE@v1.0.1:1-3`; `src/vendor/bloub/PROVENANCE.json`; `NOTICE.md@v1.0.1:22-26` |
| AgentGuard, Apache-2.0, Pebble's reliability engine | `NOTICE.md@v1.0.1:18-21`; in-app credit `src/App.vue@v1.0.1:2900-2901` ("Reliability: AgentGuard (Apache 2.0).") |
| Fraunces, Inter, Geist Mono notices | Line 1 of `src/fonts/OFL-Fraunces.txt`, `OFL-Inter.txt`, `OFL-GeistMono.txt` in this repo (copied from the npm packages, see `src/fonts/README.md`) |
| Next.js, React, Motion, Tailwind CSS, Phosphor Icons notices | Each package's licence file in `node_modules` (next 16.4.2, react 19.3.1, motion 14.6.0 with framer-motion 14.6.0, tailwindcss 4.3.3, @phosphor-icons/react 2.1.10) |
| Tools (Remotion, FFmpeg, librosa, pedalboard, pyloudnorm, sharp, Playwright) | PLAN §6.5; licence pages checked (HTTP 200) |
| Music | TODO(Lane C): title, artist, Mixkit page, licence `https://mixkit.co/license/#musicFree`, download date, SHA-256 |

---

## Pebble interface strings used word for word

All checked automatically against the v1.0.1 tag copies (see "Checks run"). Any change in the app means a change here.

| String | Where in the app |
|---|---|
| A little help, right here. | `src/Pet.vue:692` |
| Needs your review · Done · Not allowed · Undone | `src/App.vue:718` |
| Changes this file in your project. You can undo it afterwards. | `src/App.vue:726` |
| Your project files don't change. | `src/App.vue:728` |
| Pebble can't undo a command. | `src/App.vue:731` |
| Proposed source edit · original stays intact until approval | `src/App.vue:2492-2495` |
| View diff · Don't allow · Apply edit · Undo this edit | `src/App.vue:2498`, `:2553`, `:2565`, `:2588` |
| Saved memories about “…” · Nothing is forgotten until you choose Forget. These are records Pebble saved; forgetting one removes it for good. · Forget · Forgotten · All memories in Settings · Done | `src/App.vue:2057-2082` |
| In every conversation · In this project · In this conversation | `src/App.vue:1479` |
| Connect your ChatGPT account · Use a local model · Replies are made on this Mac. | `src/App.vue:1893`, `:1897`, `:1898` |
| Pebble can make mistakes. Check the evidence. | `src/App.vue:2396` |
| Continue with ChatGPT · Connect provider · Add a model file | `src/components/AdvancedSettings.vue:1171`, `:1156`, `:1150` |
| HOW PEBBLE ACTS (as "How Pebble acts") · Runs without asking · Always asks | `src/components/AdvancedSettings.vue:1365`, `:1383-1384` |
| Ask for approval · Auto in project · Full access, with their texts, and EVERY_MODE | `src/permissionModes.ts:20-42` |
| Full access increases the impact of mistakes and prompt injection. AgentGuard is a reliability check; it cannot guarantee that every command or answer is safe. | `src/components/AdvancedSettings.vue:1389-1393` |
| Remember useful context · Forget this memory · Forget all memories | `src/components/AdvancedSettings.vue:1434`, `:1484`, `:1549` |
| Pebble's change isn't verified yet. · Run the tests · Ask Pebble to finish · Accept as unverified · Keep this change without verification? Pebble records that you decided. | `src/components/RunPanel.vue:57`, `:121-127` |
| Verified · {runner} {n} passed on current files · Not verified · … | `backend/pebble/run_activity.py:58-72` |

## Allow-list for `tools/qa/copy-lint.mjs`

These exact strings contain a word the lint flags, and are correct as written: Pebble's own words, or an honest
negative statement. Allow them by exact match only; anything else with these words still fails.

| Flagged word | Exact string | Why it is fine |
|---|---|---|
| safe | Full access increases the impact of mistakes and prompt injection. AgentGuard is a reliability check; it cannot guarantee that every command or answer is safe. | App string (C-EXP-10); a warning, not a claim |
| notarized | Pebble is not notarized. | OVERRIDES §2 limit |
| notarized | not notarized | Short limit under the download button |
| notarized | Pebble is not notarized, so the first time you open it, macOS may say it cannot verify the app. | Download notice |
| notarized | Why isn't it notarized? | FAQ question and link |
| notarized | The first time you open it, macOS may say it cannot verify the app, because Pebble is not notarized. | Install by hand, step 4 |
| notarized | Pebble 1.0 is signed with the project's own stable identity, not an Apple Developer ID, and it is not notarized by Apple. Signed, notarized installers are on the list of work still to do. | FAQ answer |
| notarized, Windows, Linux | the llms.txt "Limits" lines (`seo.ts` `llmsTxt`) | Negative statements |
| Windows, Linux | Pebble runs on Macs with Apple silicon (M1 or later). There is no version for Intel Macs, Windows or Linux. | C-LIM-5 |
| Windows, Linux | There is no version for Intel Macs, Windows or Linux, and the installer won't run under Rosetta. | C-FAQ-4 |
| windows (lower case) | A small animated pebble stays on top of your other windows and joins every Space. … | App windows, not the OS (C-DESK-1); a case-sensitive "Windows" match avoids this |
| ChatGPT, OpenAI, Anthropic, Claude, Ollama, LM Studio, Chrome, Bing, Microsoft | Model cards, FAQ, privacy and trademark lines | Providers and services Pebble works with, named as plain text; not competitors and never compared |

The film's "Shown with sample data" and the page's "Shown with sample data." are required labels, not claims.

## Rewritten or removed

| What the plan or a source said | What the copy does | Why |
|---|---|---|
| PLAN §5.1 tension beat: two statements that other tools fail, then "What did it change?" | "Did it run the tests?" · "What did it change?" · "Can I undo it?" | OVERRIDES §2 bans the statements; neutral questions only |
| PLAN §4.4 and §6.5 credit "Avatar engine: bloub by Jérémy Perret (MIT)" | "Pebble's character engine: bloub by Jérémy Perret (MIT)" | OVERRIDES §2 wording wins |
| PLAN §5.1 chapter and film line "Any model" | Chapter "Your model"; film line "Your model, your choice" | "Any model" can't be sourced: Pebble supports the ways in listed in Settings › Models |
| PLAN §7.2 row 4 card titles "Connect a provider", "A model file on your Mac" | The app's own labels: "Connect provider", "Add a model file" | Verbatim app strings match the loop and the stills |
| STATUS 23:32 "Designed to be more reliable than agents that grade their own work" | (review) Used only in the allowed paraphrase "An agent shouldn't grade its own work": film T4 (C-CH-16) and the AgentGuard section (`agentGuard.intent`, C-AG-6). Never "more reliable", "better" or "faster" | OVERRIDES §2 allows exactly this one framing, and only as intent. Lane A's "Not used" predates that ruling |
| The checkout's draft README (23:38): a "what a model alone might do" table and benchmark plans | Not used | OVERRIDES §2: no comparison, no benchmark talk beyond "none published" |
| PLAN §9.3 lists "Approvals happen only in Pebble's main window" as an app string | Used, sourced to README and SECURITY.md | The app has no such string; the docs do |
| PLAN §7.2 hero link "▷ Watch the film · 1:17" | "Watch the film", duration from `chapters.ts` once Lane E sets it | The length isn't final |
| PLAN §7.2 FAQ "Does it work offline?" | "Can I use it without an internet connection?" with a qualified answer | Avoids the banned "works offline"; only local-model chat works without a network |
| PLAN §7.4 "Soon" state copy | Dropped | OVERRIDES §1: Live only. A manual `PEBBLE_RELEASE_STATE=soon` build should simply hide Download and the install pill and keep "View on GitHub" (no new copy needed) |
| PLAN and R4 use "receipt" | "check" or "result" in user-facing copy | Pebble's own jargon test bans "receipt" on user surfaces (U1 §2.7) |
| R4 "⌘. stops anything" | "⌘. stops a task" | Accuracy (`USER_GUIDE.md:44`) |
| R4 "Leaves your Mac only when you ask" | "What leaves your Mac" with no "only when you ask" | Web search can run without a prompt while its switch is on (PLAN §7.2 row 9) |
| R4's bubble greeting, written with an exclamation mark | "Hi, I'm Pebble." | No exclamation marks |
| U2 weather demo (pet timeline) | Not used | D22: the real app answers weather without a model |
| R4 "Fully local", "Private by design" | Not used | Retired line (U1 §2.6) and over-claim |

## Checks run (Lane A, 2026-10-22, about 23:40 to 00:10 IST)

- **Sources:** 21 Pebble files fetched from tag `v1.0.1` and compared with `cmp` to the checkout: all identical except
  `README.md` (the checkout has a newer draft). Every line number above was re-found with `grep -n` in the tag copies.
- **Verbatim strings:** a script compared every string in "Pebble interface strings used word for word" and the
  three permission modes with the tag copies of `App.vue`, `Pet.vue`, `AdvancedSettings.vue`, `RunPanel.vue`,
  `permissionModes.ts` and `run_activity.py`: no mismatch.
- **Voice:** the same script flattened all 857 strings in `src/content/*.ts` and scanned them, plus the raw files, for
  exclamation marks, the §9.3 banned words, American spellings (licence, colour, recognise and 20 more), competitor and internal
  model names, and the app's jargon list. Remaining hits are only the allow-listed strings above.
- **Links:** every URL in the copy returned HTTP 200 at 23:45 IST (GitHub repo, releases, tag page, latest zip,
  `SHA256SUMS`, raw and blob `install.sh`, the published docs, issues, bloub, licence and credit pages, Vercel's
  privacy policy).
- **Types:** `tsc --noEmit --strict` (TypeScript 5.9.3) on `src/content/*.ts`: no errors.

## Open items for other lanes

- **Lane E (film spec):** set `startSeconds` and `FILM_DURATION_SECONDS` in `chapters.ts`, make each chapter's
  `onScreen` and `description` match the cut, and add sound descriptions. Keep the three neutral questions.
- **Lane C (music):** fill the music entry in `credits.ts` and `CREDITS.md`; confirm the sound-effects entry.
- **Lane D (capture):** if the stills' content differs from the alt texts in `copy.ts` `media.stills`, send the
  difference to Lane A or edit the alt text to match what the picture shows.
- **Lane F (site):** render backtick spans as `<code>`; hide credit entries that still have a `todo`; show the
  chapter chip only for chapters with a start time; keep the honesty stamp computed live.
- **QA:** re-run the voice scan on the built HTML; the allow-list above is exact-match.

## Site shell (lane F1, 2026-10-23)

Strings the section stubs needed that `copy.ts` didn't have yet. They live in `src/content/stubs.ts` until the claims
pass moves them into `copy.ts`.

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-F1-1 | "Built like infrastructure." (the Infrastructure section's H2) | OVERRIDES §7 ("Built like infrastructure: a Tauri 2 shell in Rust, …") | Q. Heading; the section's facts (8,421 tests, 1,772 service checks, 40 suites) still need their own rows |
| C-F1-2 | "Private by default." (the Privacy section's H2) | OVERRIDES §7 (release-session wording), §8 C1 (allowed as the heading, with "What leaves your Mac" next to it) | Q. Never without the five destinations of C1 beside it |
| C-F1-3 | (lead, F2a) "Signed with its own identity, not an Apple Developer ID, and not notarized. No independent security audit yet." (the short honest line under every Download button, `copy.ts` `hero.honestLine`) | OVERRIDES §2; DESIGN §5 row 1, §9 ("Hero honest line"); C-LIM-1, C-LIM-2, C-LIM-4 | Q. The review's four-limit version was set back to three by the lead (DESIGN §9): the checksum limit (C-LIM-3) sits next to the `shasum` instructions in Install, where it applies, and in the full limits list |
| — | The hero's facts list "v1.0.1 / 72 MB / Apple silicon / macOS 12 or later" | C-REL-5 (`releaseMeta()`), rendered as a list, not a middle-dot string (DESIGN §3); version and size from the GitHub API at build time, known-good values otherwise (C-REL-1, C-REL-2) | I |
| — | bloub's full MIT notice on /credits | `src/content/licences.ts`, checked byte for byte against `shared/pebble/bloub/LICENSE` by `licences.test.ts` | Licence text (critic M10) |

The strings now live in `copy.ts` (`infrastructure.h2`, `privacy.h2`, `hero.honestLine`, `filmDialog.audioDescription`);
`stubs.ts` only re-exports them until F2 switches the imports. Every item in the list below was fixed by the claims
review on 2026-10-23 (straight apostrophes stay: a typographic pass is a design call, not a claim).

Found while wiring the shell (for the claims pass; the stubs avoid showing them):
- `copy.ts` `footer.resting` still ends with "It never phones home" (OVERRIDES §8 H14 drops it). The footer shows only
  "Pebble is resting." until it is fixed.
- `copy.ts` `privacy` still titles a column "Stays on your Mac" and lists four destinations; OVERRIDES §8 C1 asks for
  "Stored on your Mac" and five (with the recent conversation and recalled memories for cloud models). The same list is
  missing from `seo.ts` `llmsTxt`.
- `chapters.ts` `tested.description` still describes a test counter and "the network off" (OVERRIDES §8 C3). The /film
  stub shows chapter titles and on-screen lines only, no descriptions.
- `copy.ts` `header.nav` sends "Features" to `#desktop`; with DESIGN §5's order the first feature section is
  `#agentguard`.
- Apostrophes and quotes in the copy are straight (`isn't`, `Mac's`); typographic ones (’ “ ”) read better in Fraunces.

## Claims review (2026-10-23)

New copy for the sections that OVERRIDES §7, §9 and §10 added after Lane A's pass. Same kinds as above.

### AgentGuard, the headline difference (`copy.ts` `agentGuard`)

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-AG-5 | Heading "Evidence before “done”." | `README.md@207ec74:107` ("AgentGuard: evidence before "done"") | Q. The README's story (OVERRIDES §7). (1.0.3) Kept; step 04's "Done means tested." is withdrawn and now reads "Tests that cover a change must pass." (C-PROJ-9) |
| C-AG-6 | "An agent shouldn't grade its own work." | OVERRIDES §2 | Intent: the one allowed comparative framing |
| C-AG-7 | AgentGuard is built into Pebble as an evidence layer between the model and your project. | STATUS 23:32 ("an evidence layer between the model and your project"); `README.md@207ec74:110`; `docs/ARCHITECTURE.md@v1.0.1:29` ("a verification and evidence layer, not a security layer") | Q |
| C-AG-8 | (1.0.3) It indexes your project and grounds each request in the files that request reaches. It challenges an agent that drifts outside that scope. It also challenges an invented API, such as a call to a function that doesn't exist, but that check reads Python code only. | STATUS 23:32; `README.md@207ec74:63`, `:110-111`; `docs/ARCHITECTURE.md@v1.0.1:23`. The invented API: `CHANGELOG.md@checkout:50` ("its invented-API challenge reads Python code only"); `README.md@checkout:163` ("The model calls a function that does not exist in your Python code" → "**Challenges** the invented API … (Python projects; other languages aren't checked yet)"); the engine's resolvers read Python source (`backend/vendor/agentguard/evidence/resolvers.py@checkout:25`, `pyanalysis`) | Q. Withdrawn: "flags invented or broken dependencies", said of every language. Of the dependency findings, a new or undeclared third-party package is recorded below the challenge threshold, never challenged (`validate/checks.py@checkout:503`; `evidence/resolvers.py@checkout:453`), so the page names only the invented-API challenge |
| C-AG-9 | (1.0.3) It reads test results as Pebble observed them, never as the model reports them. When tests cover the code a task changed and haven't passed since the change, Pebble holds the task at "verification required": you run the tests, ask Pebble to finish, or accept it as unverified. Changed code without covering tests is not held. | `README.md@207ec74:111-112`; `docs/USER_GUIDE.md@v1.0.1:120-122`; `src/components/RunPanel.vue@v1.0.1:121-123`. The scope: `CHANGELOG.md@checkout:50`; `docs/USER_GUIDE.md@checkout:121-124`; 1.0.1's code as in C-PROJ-9 | Q. Not the brief's "resolve with one click": in the default mode, Run the tests opens a "Run isolated tests" card that asks again (FILM_SPEC S5c–S5d). Withdrawn: "When a task changed code and no fresh passing test run covers the change, Pebble holds it", which held changed code that no test covers |
| C-AG-10 | When a task keeps changing files its request doesn't reach, AgentGuard stops the next write. The model must explain what connects them, or split them into a separate change. | OVERRIDES §9; STATUS 23:38 ("the proposed write never runs"); `backend/vendor/agentguard/validate/checks.py:72`, `:81`, `:93-94`; `core/taskstate.py:22` (`DEFAULT_UNRELATED_LIMIT = 5`) | Q. "keeps changing": the challenge fires once 5 changed files fall outside the task |
| — | "AgentGuard: AgentGuard — evidence check" · "{N} file(s) changed that the task does not reach" · "Either explain what connects these to the task, or split them into a separate change." | `backend/pebble/guard.py` `refusal()` (line 1139 at 1.0.1, STATUS 23:38); `backend/vendor/agentguard/challenge/renderer.py:32`; `validate/checks.py:81`, `:93-94` | V (engine text, OVERRIDES §9) |
| C-AG-11 | Reliability, not security. AgentGuard checks evidence; it is not a sandbox and not a security layer. Protection comes from Pebble itself: approvals happen only in Pebble's main window; commands run without a shell in macOS's sandbox, which limits them but is not a promise against every attack; nothing a model, a web page, a file or a generated view says can widen what Pebble may do. | `README.md@207ec74:137-140`; `README.md@v1.0.1:8-10`, `:150-152`; `SECURITY.md@v1.0.1:50-54`; `NOTICE.md@v1.0.1:21` | Q. "Protection", not the README's "Safety" (a banned word); no "more reliable" (reads as a comparison) |

### Memory in six layers (`copy.ts` `memory.layers`, `recall`, `relearn`)

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-MEM-7 | Profile (Your preferences), Semantic (Facts & knowledge), Procedural (Procedures), Episodic (Past experiences, up to 1,500 kept automatically), Temporal (Time-sensitive information, each with an expiry), Working (Working context), each with what it holds | OVERRIDES §10; `README.md@207ec74:194-201`; `docs/USER_GUIDE.md@v1.0.1:139-148` | Q. Semantic says only what both sources agree on |
| C-MEM-8 | (1.0.3) Each memory Pebble recalls for a task reaches the model as labelled data, with where it came from and when, never as an instruction or a permission. | OVERRIDES §10; `README.md@207ec74:190`, `:203-204`. (1.0.3) `CHANGELOG.md@checkout:46` ("Pebble follows `PEBBLE.md` as your standing instructions; other memories are data."); `README.md@checkout:235-237` ("Recalled memory reaches the model as **labelled data, never as instructions** … `PEBBLE.md`, which you write, is the exception"); `backend/pebble/runner.py@v1.0.1:983` (`PEBBLE.md` "not again inside the recall pack") | Q. "Each memory" became "Each memory Pebble recalls for a task": `PEBBLE.md` is the one memory followed as instructions (C-MEM-5, in the list right below) |
| C-MEM-9 | (1.0.3) A memory you forget isn't learnt again from the same place. Forget all memories starts over, so Pebble can learn again. | `CHANGELOG.md@checkout:46-47` ("A memory you forget is not learnt again from the same place, but **Forget all** starts over."); `docs/USER_GUIDE.md@checkout:156-157` ("after **Forget all memories**, Pebble can learn again"); `README.md@checkout:238-239`; the button's name: `AdvancedSettings.vue@v1.0.1:1549` | Q. Withdrawn: "Pebble remembers what you forgot, so it doesn't learn it again from the same place" (`docs/USER_GUIDE.md@v1.0.1:154`), untrue after Forget all |

### Bigger tasks and the tour (`copy.ts` `orchestration`, `tour`)

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-ORC-1 | (1.0.3) A task can hand parts to agents, each with steps, time and tokens reserved from the task. Agents read, search, ask and propose. They never change your project, run commands or call connectors themselves; a worktree agent writes only in its own copy. | `README.md@207ec74:226-228`; OVERRIDES §10. (1.0.3) `CHANGELOG.md@checkout:51-52` ("**Agents** never change your project, run commands or call connectors themselves; a worktree agent writes in its own copy."); `docs/USER_GUIDE.md@checkout:181-182` ("an agent in its own worktree writes only in that copy"); `README.md@checkout:261-262` | Q (the changelog's words; "only" from the guide). Withdrawn: "they never write" (OVERRIDES §10), untrue for a worktree agent |
| C-ORC-2 | The main task re-checks each proposal against the latest files, then applies it through AgentGuard and your normal review. You can watch, message or stop each agent. | `README.md@207ec74:228-229`; `docs/USER_GUIDE.md@v1.0.1:176-178` | Q. "your normal review" follows the permission mode |
| C-ORC-3 | `/goal` gives a conversation a checklist of criteria and blockers. A goal tracks progress; it is never a permission. | `README.md@207ec74:230-231`; `docs/USER_GUIDE.md@v1.0.1:179-180` | Q |
| C-ORC-4 | Reviewed schedules run a task at set times with the model, permissions and project you approved, and wait for your review again if the model or permissions change. | `docs/USER_GUIDE.md@v1.0.1:181-183`; `README.md@207ec74:232-234` | Q. The docs name only the model and permissions as triggers, not the project |
| C-ORC-5 | If Pebble quits mid-task, it marks what was interrupted and asks before anything resumes. Rewind files puts back what a task changed, unless the files changed since. | `README.md@207ec74:235-236`; `docs/USER_GUIDE.md@v1.0.1:118-119` | Q |
| C-TOUR-1 | Pebble searches the web and reads the pages behind an answer. Sources open in your browser, and everything read online is untrusted data. | `README.md@207ec74:253-255`; `docs/USER_GUIDE.md@v1.0.1:127-133` | Q |
| C-TOUR-2 | Edit cards with Undo, tests in an isolated copy, and Git changes prepared as a plan. A Git change that deletes or publishes work always asks. | `README.md@207ec74:261-262`; `docs/USER_GUIDE.md@v1.0.1:109-117`; `src/permissionModes.ts@v1.0.1:36` | Q. Not the README's "come to you as a plan to approve": in Full access, Git changes that neither delete nor publish run without asking |
| C-TOUR-3 | Reusable skills in Markdown, hooks that can narrow but never widen what a task does, and MCP connectors. Each starts off until you review it. | `README.md@207ec74:270-271`; `docs/USER_GUIDE.md@v1.0.1:187-194` | Q |
| C-TOUR-4 | Drop in PDFs, documents and screenshots. Images are cleaned of metadata before they reach a model. | `README.md@207ec74:293` | Q. Images only: no source says document metadata is removed |
| C-TOUR-5 | A command palette, `/` commands in the message box, and ⌘. to stop a task. | `README.md@207ec74:299`; `docs/USER_GUIDE.md@v1.0.1:52-54`, `:242-243` | Q |
| — | Views and exports · Pebble for Chrome · Local and cloud, with a handoff | C-VIEW-1, C-VIEW-3 · C-MORE-6, C-LIM-10 · C-MOD-9 | Q |

### Built like infrastructure (`copy.ts` `infrastructure`)

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-INF-1 | Pebble is a Tauri 2 shell in Rust, a Vue 3 interface and a frozen Python service, which talk over a private stdio channel. | OVERRIDES §7; `README.md@207ec74:150-155` | Q |
| C-INF-2 | (v2 sections B) 8,653 automated tests at v1.0.4, none skipped. They never call a model or the network. | `README.md@26d7b19:358` (verbatim); STATUS 20:34; OVERRIDES §16 | Q. From `releaseFacts.ts`. Was 8,421 at v1.0.1 (`README.md@207ec74:323`) |
| C-INF-3 | (v2 sections B) 1,840 service checks across 45 validator suites, each run against the source and the frozen, signed app. | `README.md@26d7b19:359` ("1,840 checks across 45 validator suites, each run against the source *and* the frozen, signed app"); STATUS 20:34 ("1,840 service checks across 45 suites"); OVERRIDES §16 | Q. From `releaseFacts.ts`. Was 1,772 across 40 (1.0.1) |
| C-INF-4 | Reproducible build: the shipped backend is byte-identical to the tested one, apart from its signature. | `README.md@207ec74:325` | Q. (F2b) The page sets the four facts as a ledger under the README's own row names (Tests, Service checks, Reproducible build, Release gates) |
| C-INF-5 | Release gates: a secret scan, a licence inventory, a scan for personal paths, and every published test run in a fresh clone. | `README.md@207ec74:326`; OVERRIDES §7 | Q |
| C-INF-6 | (v2 sections B) These are facts about how Pebble is built and tested, not benchmarks. | OVERRIDES §7 ("Engineering facts, not benchmarks — fine to state") | Q. Withdrawn: "No benchmark results have been published yet." (false since STATUS 20:34). While the benchmark is shown, the section links to it ("Read the benchmark", an interface label) |

### Alt texts added (`copy.ts` `media.stills`)

`mainApproval`, `heldUnverified`, `mainChallenge` and `settingsMemory` describe lane D's stills in `public/ui/v1/`, as the
review saw them in `capture/shots/page/*-wide-light@3x.png` (kinds I and S). Every string they quote is the app's or the
engine's own (V): "Blocked" and "Pebble's change isn't verified yet." with the three buttons (`RunPanel.vue@v1.0.1:57`,
`:121-123`), and the engine strings under C-AG-10.

(1.0.3) `heldUnverified` (not rendered: the AgentGuard section uses `agentGuard.media.held`) said the run was held
"because two files changed and no tests were run", a cause that doesn't hold a task by itself (C-PROJ-9). It now
says "because two files changed and the tests that cover them weren't run": the capture's own reason
(`capture/mock/fixtures.js:94-101`: `tests/test_dates.py` covers the change; "Pebble changed dates.py, test_dates.py but
did not run the tests that cover them.").

### Rewritten or removed by the review

| What the copy said | What it says now | Why |
|---|---|---|
| Step 01 "Every edit is a card you approve, with Undo." | "In the default mode, every edit is a card you approve, with Undo." | False in Auto in project and Full access (OVERRIDES §8 C2) |
| Step 03 "Commands and Git changes wait for review." | "Terminal commands beyond a short read-only list, and Git changes that delete or publish work, always wait for your review." | False in Auto and Full; the new title is true in every mode (C2) |
| Column "Stays on your Mac"; four destinations ("the pages and weather you ask for") | "Stored on your Mac"; five destinations, with the cloud model's recent conversation and recalled memories | OVERRIDES §8 C1 |
| "It never phones home." | "No telemetry." | No direct source; it reads as "nothing leaves" (H14) |
| `chapters.ts` "tested": a dark code view "with the network off", "a test counter rises from 0 to 42" | The real held run, the "Run isolated tests" card, "Requesting isolated tests · 11 s", then Verified | Invented UI (C3); FILM_SPEC §18 |
| AgentGuard section heading "Done means tested." | "Evidence before “done”." | The README's story (OVERRIDES §7); no duplicate of step 04 |
| FAQ "challenges a step that drifts outside the files your request reaches" | "challenges an agent that drifts outside that scope" | The challenge needs 5 out-of-scope files, not one step |
| SEO privacy description "loads nothing from other companies' servers" | "loads nothing from other websites" | The site itself is served by Vercel, another company |
| The brief's "a 'verification required' hold you resolve with one click" | Not used | Two clicks in the default mode |
| The brief's "documents and images, metadata stripped" | "Images are cleaned of metadata before they reach a model." | Only images are documented |
| The README's "Safety comes from Pebble's host" and "more reliable" | "Protection comes from Pebble itself"; no "more reliable" | A banned word, and a phrase that reads as a comparison |
| The hero's honest line without the checksum limit | All four release limits, short | OVERRIDES §2 |

## Sections 8–15 and the other pages (lane F2b, 2026-10-23)

New strings that lane F2b added while building sections 8–15, the footer and /film, /credits, /privacy. Everything else
these parts show is in the rows above.

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-F2B-1 | (v2 sections B) "Settings › Memory in Pebble 1.0.4." (the caption under the cropped Settings › Memory still; it said 1.0.1 until the lane shots' retake) | The lane shots' Pebble 1.0.4 retake of the same files ("Pebble 1.0.4 product shots" below), first lane D's capture of the 1.0.1 UI, `public/ui/v1/settings-memory-{light,dark}-*.{avif,webp}` (HANDOFF-D-capture); the crop shows the sheet from its title to the third record, untouched | I. Followed by "Shown with sample data." |
| C-F2B-2 | "The card's words are the ones Pebble shows." (under MemoryForgetDemo, after "Interactive example.") | `src/App.vue@v1.0.1:2055-2084` (C-EXP-11, C-EXP-12): heading, note, Forget, Forgotten, All memories in Settings, Done, the "Forget: …" label | I. The demo's three memories and the request are sample data (C-EXP-13). As in the app, Forget gives way to "Forgotten" and Done closes the card |
| C-F2B-3 | The honesty stamp "This page: N cookies, N trackers, N third-party requests" (a list, never a middle-dot string) and its note "A tracker is any request to a known analytics or advertising service, including Vercel's own analytics, and any beacon." | Counted live in the browser (`src/components/shell/Footer.stamp.tsx`): Resource Timing entries plus a PerformanceObserver, `document.cookie`; trackers = a fixed list of analytics and advertising hosts, Vercel's `/_vercel/insights` and `/_vercel/speed-insights`, and `beacon`/`ping` requests | I. Nothing is shown until it has been counted (no JavaScript, no stamp). Lane F2b's QA (`.work/qa/f2b/check.mjs`) read "0 cookies / 0 trackers / 0 third-party requests" on `next start` at 320–1440 px |
| C-F2B-4 | "bloub's code runs in this site's JavaScript, to draw the live pebble, so its MIT licence is reproduced here in full." (/credits) | `src/components/pebble/PebbleLive.tsx` imports the engine from `shared/pebble` (lane B: bloub from Pebble v1.0.1 `src/vendor/bloub/`); critic M10 | I. The text below it is `licences.ts`, checked byte for byte against `shared/pebble/bloub/LICENSE` |
| — | Install's four requirement cells: "Mac: Apple silicon, M1 or later"; "macOS: macOS 12 or later, Built and tested on macOS 27"; "Download: 72 MB, Version 1.0.1"; "Price: Free, A cloud model's costs depend on your provider." | C-INST-2 (with OVERRIDES §8 H14's "tested on macOS 27", always on the Install section), C-REL-1, C-REL-2 (size and version from `release.ts`), C-INST-3 | Q. Same facts as before, split into value and note |
| — | /film: "What you see" (chapters.ts `description`), "On screen" (`onScreen`) and "Sound" (the bracketed cues of `docs/film-captions.json`, mirrored in `src/content/filmCaptions.ts`) | FILM_SPEC §13, §18 (lane E); the claims review's chapters.ts | V/Q. `filmCaptions.test.ts` fails if the mirror drifts from the JSON, or if chapters.ts misses an on-screen line the captions carry |
| — | Install, made as short as design comp 2: "In Terminal, on your Mac:"; "Read the installer first" (links to `install.sh` on GitHub); "Add `-s -- --dry-run` after `bash` to see what it would do. Nothing changes."; "Add `-s -- --uninstall` after `bash` to uninstall it later. The app is moved aside, and your data stays." | C-INST-9 (`README.md@v1.0.1:40-49`: "Options, added after `bash -s --`", "show what it would do; nothing changes"); C-INST-13 | Q. The full commands stay in the README, and the full uninstall command is in the FAQ (C-INST-13). `--version 1.0.1` is no longer on the page |
| — | Install, "Or download it and check it": "Download both into one folder. In Terminal, in that folder, run `shasum -a 256 -c SHA256SUMS`. It should print `Pebble-macos-arm64.zip: OK`.", with "The checksum shows the download arrived intact. It does not prove who made it." right under it; then the drag to Applications, and the first-run steps as one step | C-INST-11, C-LIM-3 (DESIGN §9: the checksum limit next to the shasum step), C-DL-1, C-DL-2, C-DL-3 | Q. The README's five steps, in three |
| — | "Also inside" no longer repeats "Views and exports": the views paragraph right above it says the same (C-VIEW-1, C-VIEW-3) | OVERRIDES §10 | Layout, not a claim |

## Sections 1–7 (lane F2a, 2026-10-23)

New strings that lane F2a added while building the hero, the film section, AgentGuard, On your desktop, the project
story, Your model and You set the pace. Everything else these sections show is in the rows above (C-HERO, C-FILM,
C-AG, C-DESK, C-PROJ, C-MOD, C-PACE, C-EXP).

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-F2A-1 | On your desktop, the quick chat's text alternative: "Pebble's quick chat open above the pebble, in the corner of a sage-green desktop. Asked “What does 'day is out of range for month' mean?”, Pebble answers: “Python is being asked for a date that doesn't exist, like 31 February. If it's from your invoice export, open invoice-kit and I'll look.”" | The image: Pebble 1.0.1's companion window, `capture.mjs` scene `pet-chat` (both themes, 3x), with the app's own pebble taken out by `tools/assets/quick-chat.mjs` (the page's live pebble stands in its place) → `public/ui/v1/quick-chat-{light,dark}-{768,1152}.{avif,webp}`. The question and the reply are `fixtures.js` (`text.petQuestion`, `reply.pet`; D22) | S/D. Describes the picture; "Shown with sample data." sits under it |
| C-F2A-2 | Your model, the Settings › Models crop's text alternative: "Pebble's Settings, on the Models tab: a GGUF model file on this Mac, the buttons Add a model file and Connect provider, and Continue with ChatGPT." | `public/ui/v1/settings-models-*` (lane D, the 1.0.1 UI with `fixtures.js`); the labels `src/components/AdvancedSettings.vue@v1.0.1:1150`, `:1156`, `:1171` | D. Phones show the buttons part of the same still |
| C-F2A-3 | Project story, step 03: "A command card that can change files says first:" and, quoted, "Runs this command in your project, where it can change files. Pebble can't undo a command." | `src/App.vue@v1.0.1:731` (a command card's lead line when the command can change files; `:732` is the other case, "Runs this command in your project without changing files.") | V (the quote); I (the line before it) |
| C-F2A-4 | Project story, step 04: "When a task changed code, its reply carries a one-line result, such as:" then "Verified · pytest 42 passed on current files" and the four "Not verified · …" lines | `backend/pebble/run_activity.py@v1.0.1:50-73` (`verdict()`: the completion check's one-line receipt, or none when the run changed no code); the lines are C-AG-2 and C-AG-4 | D. "such as": the list leaves out "Not verified · the checker wasn't ready" and "Not verified · N changed files" (`:64`, `:72`). The numbers are sample data. (1.0.3, checked and kept) The stage claims no hold: a "Not verified" line can also close a task that isn't held, as when no test covers the changed code (outcome `not_verified`, `backend/pebble/guard.py@v1.0.1:748-751`; `run_activity.py@v1.0.1:69-72`) |
| C-F2A-5 | Project story, step 02, the crop's text alternative: "The steps of a finished task in Pebble's Activity tab, from the two approved edits through “Requesting isolated tests · 11 s” to “Verified · pytest 42 passed on current files · 2 s”." | `public/ui/v1/main-done-*` (lane D), Details › Activity › Steps | D |
| C-F2A-6 | AgentGuard, the three crops' text alternatives (`agentGuard.media`: the refused step and its details; the held reply with "Not verified · 2 changed files, no tests run", "Blocked", "Pebble's change isn't verified yet." and its three buttons; the verified reply with "Verified · pytest 42 passed on current files" and "Done, and verified:") | `public/ui/v1/main-challenge-*`, `held-unverified-*`, `main-done-*` (lane D); the strings: C-AG-10 (engine), `src/components/RunPanel.vue@v1.0.1:57`, `:121-123`, `backend/pebble/run_activity.py@v1.0.1:62`, `:72` | D. Phones crop the two replies to their first three lines (the one-line result is the second); the caption under the switch carries the hold's sentence and choices as text |
| C-F2A-7 | You set the pace, under "Interactive example": "Choose a mode. The words are the ones Pebble shows." | C-EXP-4..7: the dial's names and texts are `src/permissionModes.ts@v1.0.1:20-38` word for word | I |
| C-F2A-8 | "In Pebble's Settings, under the three modes:" (introduces the quoted "In every mode, …" sentence) | `src/components/AdvancedSettings.vue@v1.0.1:1366-1388`: `EVERY_MODE` is the setting note right below the three-mode radiogroup | Q |
| — | Labels, no claim: the story's rail "How a coding task goes" with "Edits", "Tests", "Commands and Git", "AgentGuard"; the AgentGuard switch "Show the task", "Verification required" (`docs/USER_GUIDE.md@v1.0.1:122`) and "Verified"; the teaser's button name "film preview" | — | Labels |

## OVERRIDES §12 corrections (2026-10-23)

The release session's audit of every command, shortcut and feature claim (STATUS 14:58; OVERRIDES §12, binding, and
true for 1.0.3). The version shown stays "v1.0.1 · 72 MB" until the 1.0.3 release post. Sources: the rows named below.

### Changed

| Where | Before | After | Rows |
|---|---|---|---|
| `copy.ts` `views.points` | "Export a view as PDF, Word, Excel, CSV or HTML. Saving always goes through …" | "Export a view as Word, Excel, CSV or HTML. Saving always goes through …" | C-VIEW-3 |
| `copy.ts` `models.lead` | "Connect a model in Settings › Models. One model runs at a time, and you pick the model and its effort for each message." | "Connect a model in Settings › Models. One model runs at a time: switch it or its effort at any time, and the choice applies to every conversation." | C-MOD-1 |
| `copy.ts` `honestLimits.product`, "Pebble for Chrome needs Developer mode" | "… you load it in Chrome's Developer mode. Pebble's own built-in browser is not available yet." | "… you load it in Chrome's Developer mode. It has been tested against a simulated Chrome, not yet in a real one. Pebble's own built-in browser is not available yet." | C-LIM-10 |
| `copy.ts` `honestLimits.product`, new item after it | — | "Other apps. Pebble can't see or operate other apps yet. It can only open one, which in the default mode waits for your approval." | C-LIM-15 |
| `copy.ts` `honestLimits.product` "Schedules need Pebble open", `orchestration.limit`, the `more` "Bigger tasks" tile's limit | "Scheduled tasks run only while Pebble is open." | "Scheduled tasks run only while Pebble is open. Their results show in Pebble; macOS notifications are off until you turn them on." | C-LIM-11 |
| `copy.ts` `explainers.permissionDial.appsNote` (new), rendered by `Pace.tsx` under the quoted "In every mode, …" sentence | — | "Pebble can't see or operate other apps yet: an app launch only opens one." | C-EXP-14 |
| `copy.ts` `more` "Pebble for Chrome" tile (not rendered) | "Pebble can look at and act in a Chrome tab you share and grant, one site at a time. Sign-in, password and payment pages are handed back to you unread." Limit: "For 1.0 you load it in Chrome's Developer mode; it isn't in the Chrome Web Store." | "Pebble can look at and act in one Chrome tab you share and then grant, on that tab's site, for up to 30 minutes. It can't open, close, list or switch tabs, or leave the site. Every press asks first, and pages that look like sign-in, password or payment pages are handed back to you unread." Limit: "… it isn't in the Chrome Web Store. It has been tested against a simulated Chrome, not yet in a real one." | C-MORE-6, C-LIM-10 |
| `seo.ts` `llmsTxt`, "What it does" | "Memory: six kinds of memory you can see, search, edit in ~/.pebble/PEBBLE.md and forget. One switch turns memory off." | "Memory: six kinds of memory. You can see, search, add and forget memories, but not edit them; the only thing you edit is ~/.pebble/PEBBLE.md. One switch turns memory off." | C-MEM-10 |
| `seo.ts` `llmsTxt`, "Limits" | "Models make mistakes. Pebble for Chrome needs Chrome's Developer mode. Scheduled tasks run only while Pebble is open." | Four lines: "Models make mistakes."; "Pebble for Chrome needs Chrome's Developer mode. It works in one Chrome tab you share and then grant, on that tab's site, for up to 30 minutes; it can't open, close, list or switch tabs, or leave the site, and every press asks first. It has been tested against a simulated Chrome, not yet in a real one."; "Pebble can't see or operate other apps yet. It can only open one, which in the default mode waits for your approval."; "Scheduled tasks run only while Pebble is open. Their results show in Pebble; macOS notifications are off until you turn them on." | C-LIM-7, C-MORE-6, C-LIM-10, C-LIM-15, C-LIM-11 |

### Withdrawn

- PDF export (C-VIEW-3): 1.0.1's export panel offered it, but a release build could never make the file.
- "you pick the model and its effort for each message" (C-MOD-1): the choice applies to every conversation.
- "edit in ~/.pebble/PEBBLE.md" in the `llms.txt` memory line, which read as editing memories (C-MEM-10).
- In the unused Chrome tile, "Sign-in, password and payment pages are handed back to you unread" without "that look
  like" (C-MORE-6), and "one site at a time" in the long form (now "on that tab's site").

### Checked and kept

- The tour's "Pebble for Chrome": "Share a Chrome tab and Pebble can look at it and act in it, one site at a time, with
  your grant. For 1.0 it loads in Chrome's Developer mode." STATUS 14:58: "fine as it is". It is the short form; the
  long forms (the limits list, the tile, `llms.txt`) carry the simulated-Chrome caveat.
- The dial's and the quote's 1.0.1 words with "browser and app-window actions" (C-EXP-4..7): Pebble's own text, kept
  word for word, with C-EXP-14 right under the quote. Switch to 1.0.3's strings when 1.0.3 is published. (Done with
  1.0.4's identical strings: see "Pebble 1.0.4 product shots" at the end.)
- "app launch" and "app launches" in the three modes: true, Pebble can open an app (C-LIM-15).
- ⌘+ and ⌘−: not on the page, in the film, in `llms.txt` or in the post, and not to be added before 1.0.3 is out
  (`CHANGELOG.md@checkout:14`, `:35`). ⌘⇧Space and ⌘. stay (`docs/USER_GUIDE.md@checkout:250`, `:252`).
- "Drop in PDFs, documents and screenshots" (C-TOUR-4): attachments, not exports. Pebble reads PDFs
  (`backend/pebble/attachments.py@checkout:124-142`; `docs/USER_GUIDE.md@checkout:47`).
- The sample project's own "PDF invoices" and "CSV export" (`fixtures.js`, FILM_SPEC) describe invoice-kit, not Pebble.
- The FAQ, the film's on-screen lines, captions and descriptions, `CREDITS.md` and the LinkedIn post: no affected
  wording (searched for PDF, export, control or operate with app, window or browser, Chrome, tab, browser, memory with
  edit, per or each conversation, schedule, notification, ⌘+, ⌘−, text size and zoom).

### Watch items from the 1.0.3 notes (resolved: see "1.0.3 Corrections (2026-10-23)" below)

`CHANGELOG.md@checkout:44-57` and the 1.0.3 guide correct more claims that rows above rely on. The release session
hasn't asked the page to change these; they need its word before the 1.0.3 copy pass. (Kept as written when the §12
pass ended. The main loop then had them applied and told the release session so (STATUS 15:25, "These are being fixed
now"); the section below lists what changed and what was checked and kept.)
- **AgentGuard's hold.** "Changed code without covering tests is not held." (`docs/USER_GUIDE.md@checkout:121-123`;
  `CHANGELOG.md@checkout:50`: "holds changed code only when tests cover it"). Rows that say a task that changed code
  must have a passing test run: C-PROJ-9, C-FAQ-13, C-AG-9, the `llms.txt` AgentGuard line, the LinkedIn post, and
  the film's "Done means tested" (C-CH-6).
- **Invented APIs.** "its invented-API challenge reads Python code only" (`CHANGELOG.md@checkout:50`;
  `README.md@checkout:163`) against C-AG-8's "flags invented or broken dependencies".
- **Agents.** "a worktree agent writes in its own copy" (`CHANGELOG.md@checkout:51-52`;
  `docs/USER_GUIDE.md@checkout:181-182`) against C-ORC-1's "they never write".
- **Memory.** "Remember that …" saves a preference when it is about you, and a fact otherwise (C-MEM-3); Pebble follows
  `PEBBLE.md` as your standing instructions (C-MEM-5, C-MEM-8); after Forget all, Pebble can learn again (C-MEM-9)
  (`CHANGELOG.md@checkout:44-47`; `docs/USER_GUIDE.md@checkout:152-162`).
- **Exports.** A Word file turns tables into paragraphs and is labelled unverified (C-VIEW-3;
  `CHANGELOG.md@checkout:55-56`).

## 1.0.3 Corrections (2026-10-23)

The "Corrections" of Pebble's 1.0.3 changelog (`CHANGELOG.md@checkout:31-57`: "These claims, in the README, the user
guide and the app, said more than Pebble does.") and the 1.0.3 guide (`docs/USER_GUIDE.md@checkout`). They correct
documentation, not behaviour, so they hold for 1.0.1, the version the page shows ("v1.0.1 · 72 MB" stays until the
release session posts 1.0.3). The rows named below carry the sources, with the 1.0.1 code where it was read.

### Changed

| Where | Before | After | Rows |
|---|---|---|---|
| `copy.ts` `project.steps[3]`, title | "Done means tested." | "Tests that cover a change must pass." | C-PROJ-9 |
| `copy.ts` `project.steps[3]`, body | "A task that changed code must have a passing test run of those changes before Pebble calls it finished. Written JSON and CSV files must parse. When the evidence is missing, …" | "Before Pebble calls a task finished, tests that cover the code it changed must have passed since the change, and written JSON and CSV files must parse. When the evidence is missing, …" | C-PROJ-9 |
| `copy.ts` `project.steps[3]`, limit | "AgentGuard checks evidence; it is not a security layer." | "Changed code without covering tests is not held. AgentGuard checks evidence; it is not a security layer." | C-PROJ-9, C-PROJ-10 |
| `copy.ts` `agentGuard.layer[1]` | "… It challenges an agent that drifts outside that scope, and flags invented or broken dependencies." | "… It challenges an agent that drifts outside that scope. It also challenges an invented API, such as a call to a function that doesn't exist, but that check reads Python code only." | C-AG-8 |
| `copy.ts` `agentGuard.layer[2]` | "… When a task changed code and no fresh passing test run covers the change, Pebble holds it at “verification required”: …" | "… When tests cover the code a task changed and haven't passed since the change, Pebble holds the task at “verification required”: … Changed code without covering tests is not held." | C-AG-9 |
| `copy.ts` `memory.recall` | "Each memory reaches the model as labelled data, …" | "Each memory Pebble recalls for a task reaches the model as labelled data, …" | C-MEM-8 |
| `copy.ts` `memory.relearn` | "Pebble remembers what you forgot, so it doesn't learn it again from the same place." | "A memory you forget isn't learnt again from the same place. Forget all memories starts over, so Pebble can learn again." | C-MEM-9 |
| `copy.ts` `memory.points[1]` | "Start a message with “Remember that …” to save a preference. Pebble still answers the rest." | "Start a message with “Remember that …” to save something right away: a preference when it is about you, otherwise a fact. Pebble still answers the rest." | C-MEM-3 |
| `copy.ts` `memory.points[3]` | "… It is information about you, never a permission." | "… Pebble follows it as your standing instructions, and it never grants a permission." | C-MEM-5 |
| `copy.ts` `orchestration.points[0]` | "… Agents read, search, ask and propose; they never write, run commands or call connectors." | "… Agents read, search, ask and propose. They never change your project, run commands or call connectors themselves; a worktree agent writes only in its own copy." | C-ORC-1 |
| `copy.ts` `more`, "Bigger tasks" tile (not rendered) | "… Agents read and propose; only the main task applies changes, through your normal review." | "… Agents read and propose (a worktree agent writes only in its own copy); only the main task changes your project, through your normal review." | C-MORE-3 |
| `copy.ts` `media.stills.heldUnverified` (not rendered) | "… because two files changed and no tests were run, …" | "… because two files changed and the tests that cover them weren't run, …" | "Alt texts added" |
| `faq.ts`, "Is AgentGuard a security feature?" | "… it checks the evidence: a task that changed code must have a passing test run of those changes, and written JSON or CSV files must parse." | "… it checks the evidence: when tests cover the code the task changed, they must have passed since the change, and written JSON or CSV files must parse. Changed code without covering tests is not held." | C-FAQ-13 |
| `seo.ts` `llmsTxt`, AgentGuard | "… A task that changed code must have a passing test run of those changes before Pebble calls it finished, and an agent that drifts … is challenged. …" | "… Before Pebble calls a task finished, tests that cover the code it changed must have passed since the change; changed code without covering tests is not held. An agent that drifts … is challenged. …" | C-PROJ-9 |
| `.work/social/linkedin-post.txt` (not committed) | "… AgentGuard checks that tests of the changed code have passed. It checks evidence; …" | "… AgentGuard checks that the tests covering the changed code have passed since the change; if no test covers it, the task isn't held. AgentGuard checks evidence; …" | LinkedIn table |
| This file, "How to read the sources" | the status file's absolute path in a home folder | `../PEBBLE_SESSIONS_STATUS.md`, outside this repository | (critic H13) |

### Withdrawn

- "Done means tested" (step 04's title; the film's line and chapter title, C-CH-6, which the film lane changes) and "a
  task that changed code must have a passing test run of those changes" (C-PROJ-9, C-FAQ-13, `llms.txt`), with C-AG-9's
  "no fresh passing test run covers the change" and the post's "checks that tests of the changed code have passed":
  changed code without covering tests is not held.
- "flags invented or broken dependencies" (C-AG-8): the invented-API challenge reads Python code only, and a new or
  undeclared third-party package is never challenged.
- "they never write" (C-ORC-1): a worktree agent writes in its own copy.
- "to save a preference" for every "Remember that …" (C-MEM-3); "information about you" for `PEBBLE.md` (C-MEM-5); the
  recall rule's "Each memory" without the `PEBBLE.md` exception (C-MEM-8); "Pebble remembers what you forgot" without
  Forget all (C-MEM-9).

### Checked and kept

- The AgentGuard H2 "Evidence before “done”." (C-AG-5) and "An agent shouldn't grade its own work." (C-AG-6).
- Step 04's stage, "When a task changed code, its reply carries a one-line result, such as:" with the "Not verified"
  lines (C-F2A-4): it claims no hold.
- C-AG-1 (`agentGuard.lead`, not rendered), C-LIM-8 ("AgentGuard checks evidence such as test runs"), C-FAQ-14,
  C-FAQ-15 ("run the covering tests"), C-ORC-2, C-FILM-1 ("from a question to a tested change"), the teaser's and the
  loops' text alternatives, and `agentGuard.media`: they describe the demo, whose change has covering tests.
- C-VIEW-3 (Word export): it doesn't say a table survives. C-MEM-4, C-MEM-6 ("Forgetting removes a memory for good":
  the app's words, about the record) and C-MEM-10 (`llms.txt`: add and forget, edit only `PEBBLE.md`).
- The other 1.0.3 Corrections change nothing here: ⌘+/⌘−, PDF, app windows, Chrome, models and schedules were handled
  under OVERRIDES §12; the page doesn't mention `/stop`, attachment formats beyond "PDFs, documents and screenshots"
  (C-TOUR-4), or local MCP servers; "A switch can't change while a task runs" agrees with C-PACE-3.

### Open (files this register doesn't change)

- Film lane: "Done means tested" is still in `chapters.ts:69` (the chapter's title) and `:73`, `filmCaptions.ts:39`,
  `docs/film-captions.json:34`, `video/src/film/timeline.ts:399` and `docs/FILM_SPEC.md:150`, `:340`, `:515`, `:723`,
  `:846` at the time of this pass.
- `docs/DESIGN.md:126` still says "Done means tested." stays as step 04's title.

## Pebble 1.0.4 product shots (lane shots, 2026-10-23)

Pebble 1.0.4 was published at 20:34 (STATUS 20:34; tag `v1.0.4`, commit `3d872bd`). Every product still was retaken
from the read-only checkout, whose UI source (`src/`) is unchanged since 17:34:49, before the publication, so the
captures and the `@v1.0.4` citations above are the published 1.0.4. Between 1.0.1 and 1.0.4, the captured surfaces
changed only in the window's own words: the permission modes (C-EXP-4..7), the Chrome-tab tool switch ("Screen
control: Chrome tabs you share", `AdvancedSettings.vue@v1.0.4:344`), the user bubble without its leading space
(`App.vue@v1.0.4:2044`) and Settings › Models naming a local model's window once (`AdvancedSettings.vue@v1.0.4:1087-1089`).
The service's templates that the demo fixtures copy (timeline rows, verdicts, the held-run notice, the forget reply,
AgentGuard's challenge) are unchanged, and so is every sample (S) row.

### Changed

| Where | Before (1.0.1) | After (1.0.4) | Rows |
|---|---|---|---|
| `copy.ts` `explainers.permissionDial.modes[2].alwaysAsks` (Full access) | "Other terminal commands (including grep and builds), connector calls, installs, browser and app-window actions, network or dangerous commands, and Git changes that delete work or publish it." | "Other terminal commands (including grep and builds), connector calls, installs, presses in a Chrome tab, network or dangerous commands, and Git changes that delete work or publish it." | C-EXP-4..7 |
| `copy.ts` `explainers.permissionDial.everyMode` (quoted by `Pace.tsx`) | "… Browser and app-window actions, connector calls and installs always ask. Protected credentials stay blocked." | "… Connector calls, installs and every press in a Chrome tab you granted always ask; looking, typing and choosing in that tab run under your grant. Protected credentials stay blocked." | C-EXP-4..7 |
| `copy.ts` `explainers.permissionDial.appsNote` (comment only; the sentence is unchanged) | it kept "app-window actions" from reading as app control | it says what an app launch is, which all three modes still list | C-EXP-14 |
| `public/ui/v1/*` (the nine page stills, both themes, 2400 and 1200 w) | Pebble 1.0.1 | Pebble 1.0.4; the alt texts (`media.stills`) still describe them word for word | "Alt texts added" |

### Checked and kept

- The other mode names and texts, "The default" (C-EXP-8), the "How Pebble acts", "Runs without asking" and "Always
  asks" labels, and C-EXP-10 (`AdvancedSettings.vue@v1.0.4:1390-1392`): unchanged in 1.0.4.
- C-LIM-15 and C-EXP-14 ("Pebble can't see or operate other apps yet"): STATUS 20:34 says the 14:58 corrections hold
  for 1.0.4.
- The copy lint's every/always rule: the new "In every mode, …" sentence starts with its own mode qualifier.

## Sections 2–7 on the system (lane v2-sections-a, 2026-10-24)

The film, AgentGuard, On your desktop, the project story, Models and You set the pace moved onto the Lexington system
(DESIGN-LEXINGTON §6). Their words are the approved ones and only moved; one label and three alt texts are new (two of
them describe loops L2 and L4 as the loops lane rendered them).

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-SYS-16 | "The film / {length}, with sound." (the film's rail label; "1:16, with sound.") | The length: `chapters.ts` `FILM_DURATION_SECONDS` (76.8 s: 2,304 frames at 30 fps, `docs/FILM_SPEC.md` §1) through `formatTimecode` (whole seconds); "with sound": `film.playNote` (C-SYS-1), `film.lead` (C-FILM-1, "with music") | I. Label; the length is data. While the length is unknown the label is C-SYS-1's "Plays with sound." |
| C-F2A-6 (alt) | `agentGuard.media.verified`: "The head of a reply in Pebble after the tests ran: “Verified · pytest 42 passed on current files”, then “Done, and verified:”." | `public/ui/v1/main-done-*` (Pebble 1.0.4), the ledger's crop (`AgentGuard.tsx` `VERIFIED`, `VERIFIED_PHONE`) | Alt text. Before, it also named the list under the head, which the new crop leaves out |
| C-F2A-9 (alt) | `media.loops.models.label` (loop L2): "Pebble's Models settings. The three ways to connect a model come forward: Add a model file, Connect provider and Continue with ChatGPT." | L2 as rendered (`HANDOFF-v2-loops.md`: the ways in come forward, the models list recedes; it no longer moves or stops on Add a model file); the buttons' names `src/components/AdvancedSettings.vue@v1.0.1:1150`, `:1156`, `:1171` (C-MOD-6, "Pebble interface strings") | Alt text, the loops lane's wording. Shown only once L2 is on the page |
| C-F2A-10 (alt) | `media.loops.isolatedTests.label` (loop L4): "The “Run isolated tests” card. Run tests is pressed, the timeline shows “Requesting isolated tests · 11 s”, then the check “Verified · pytest 42 passed on current files”." | L4 as rendered (`HANDOFF-v2-loops.md`: the card, Run tests, the steps, "· 11 s", Verified); the card's title and button `src/App.vue@checkout:2492`, `:2587`; the step `backend/pebble/app.py@checkout:2464`; C-F2A-5's steps | Alt text, the loops lane's wording. Before, it left out the card and the press. Shown only once L4 is on the page |

Moved, not changed:
- AgentGuard's evidence ledger titles its three rows with strings that already have rows: the engine's summary
  `agentGuard.challenge.summary(5)` (OVERRIDES §9, with C-AG-10 beside it), C-AG-3 ("Pebble's change isn't verified
  yet.", with `agentGuard.layer[2]`, C-AG-7..9) and C-AG-2 (with the second sentence of C-AG-1). The held/verified
  switch is retired, so `agentGuard.toggle` is no longer shown.
- Two-tone heads: AgentGuard (C-AG-5, then C-AG-6), You set the pace (C-PACE-1 cut after its first sentence).
- The explainers' "Interactive example" mark is a stone: the accent keeps its three jobs.

## Lexington system (lane v2-system, 2026-10-23)

The rail labels and the footer's column names of the Lexington system (DESIGN-LEXINGTON §3.1, §11), in
`src/content/labels.ts`. Each fact repeats a string that already has its own row; none adds a fact. The two-tone
headings are pairs of approved strings, or one approved lead cut after its first sentence (`firstSentence()` in
`src/components/ui/twoTone.ts`, checked by `ui.test.ts`); they need no rows of their own.

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-SYS-1 | "The film / Plays with sound." | `film.playNote` | Q. Label |
| C-SYS-2 | "AgentGuard / The evidence layer" | `agentGuard.layer[0]` ("an evidence layer"), C-AG-7 | Q. Label |
| C-SYS-3 | "On your desktop / Joins every Space" | `desktop.lead`, C-DESK-1 | Q. Label |
| C-SYS-4 | "In your project / How a coding task goes" | `project.rail.label` | Q. Label |
| C-SYS-5 | "Models / Three ways in" | `models.cards` (three ways in), C-MOD-2..7 | Q. Label |
| C-SYS-6 | "Permissions / Three modes" | `pace.lead`, C-PACE-1 | Q. Label |
| C-SYS-7 | "Memory / Six labelled layers" | `memory.layers`, C-MEM-7 | Q. Label |
| C-SYS-8 | "Views / Built from data" | `views.lead` ("from data"), C-VIEW-1 | Q. Label |
| C-SYS-9 | "Engineering / Facts, not benchmarks" | `infrastructure.note`, C-INF-6 | Q. Label. (v2 sections B) The note changed and still says it: "…not benchmarks." |
| C-SYS-10 | "Privacy / No telemetry" | `privacy.stays`, C-PRIV-5 | Q. Label |
| C-SYS-11 | "Install / Version {version}" | `release.version` from `src/lib/release.ts` (the GitHub API, known-good otherwise), C-REL-1 | I. Label; the version is data |
| C-SYS-12 | "Limits / Stated plainly" | `honestLimits.lead` ("Pebble states its limits plainly.") | Q. Label |
| C-SYS-13 | "Open source / Apache-2.0" | `openSource.repoCard.licence`, C-OSS-1 | Q. Label |
| C-SYS-14 | "Get Pebble / {size}" | `release.sizeLabel` from `src/lib/release.ts`, C-REL-2 | I. Label; the size is data |
| C-SYS-15 | Footer column names "Pebble", "This site", "Appearance" | interface labels (DESIGN-LEXINGTON §6 Footer) | Interface |

## Benchmarks and the 1.0.4 release facts (lane v2 sections B, 2026-10-24)

The release session published Pebble 1.0.4 at 20:34 (STATUS 20:34; OVERRIDES §16) and, with it, the benchmark against
Claude Code CLI; at 21:29 it published a correction (Pebble commit `26d7b19`; STATUS 21:29; OVERRIDES §18). The release
facts now have one source, `src/content/releaseFacts.ts` (C-REL-1..6, C-INF-2, C-INF-3, C-OSS-2 above, changed in
place and marked "(v2 sections B)"), and the benchmark section's words and numbers live in
`src/content/benchmarks.ts`. Every benchmark number is derived from Pebble's own analysis by
`src/content/benchmarks.test.ts`.

**Sources for this part.** `BENCH:n` is line n of `docs/PEBBLE_V1_BENCHMARKS.md` at Pebble commit `26d7b19` (raw:
`https://raw.githubusercontent.com/tohin003/Pebble/26d7b19/docs/PEBBLE_V1_BENCHMARKS.md`; byte-identical to `main` and
to the read-only checkout on 2026-10-24 at 00:13 IST). `analysis` is `docs/benchmarks/claude-opus-5-5/analysis.json` at
the same commit, vendored byte for byte as `docs/benchmarks/claude-opus-5-5.analysis.json` (sha256 `63e688d3…382b`).
OVERRIDES §18 says to cite these and the status file's 20:34 and 21:29 entries, never the 13:21 preview; nothing here
cites it.

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-BENCH-1 | H2: "Pebble matches Claude Code on the same model, within the margin." | STATUS 20:34 ("Use "Pebble matches Claude Code on the same model, within the margin""), 21:29 ("What stands"); OVERRIDES §11, §16, §18; BENCH:128-131 ("no difference shown … neither product is better on this corpus") | Q. The only headline allowed, word for word; `benchmarks.test.ts` pins it |
| C-BENCH-2 | Lead: "Pebble 1.0.2 and Claude Code CLI 2.1.309 ran the same 45 tasks, three times each, on Claude Opus 5.5. Paired run by run, the difference is −3.3 points, and its 95 % interval, from −9.2 to +2.5, includes zero: no difference is shown either way." | BENCH:128-131; analysis `paired` (delta −0.0333, cluster95 −0.0917 to +0.0250) | Q |
| C-BENCH-3 | "How it was measured": Model ("Claude Opus 5.5 at medium effort, for both. Claude Code's sub-agents used the same model."); Builds ("Pebble 1.0.2, its signed release candidate, and Claude Code CLI 2.1.309, one pinned copy for the whole run. Measured on Pebble 1.0.2; Pebble 1.0.4 doesn't change how a task runs."); Tasks ("45 tasks in nine families of five … Each ran three times, once in each of three phrasings: 135 runs per product."); Conditions ("The same files, prompts, follow-up turns and 15-minute limit, in a fresh folder for every run. Web tools were off for both; research tasks read saved pages given as files."); Autonomy ("Pebble in Auto in project, approving only each task's in-scope steps. Claude Code with its permission prompts off, inside a macOS sandbox profile that refuses writes outside the run's folder."); Grading ("Automated graders read the replies and the files, never the product's name. A run succeeds only if every check passes."); Fixed in advance ("The plan, its seed and its claim rule were registered before the first run. Every planned run counts once, and none was skipped. A claim needs the whole interval above zero.") | Model BENCH:143; builds BENCH:142, STATUS 20:34 ("It measured Pebble 1.0.2, and 1.0.4 doesn't change how a task runs"), OVERRIDES §16 ("say "measured on Pebble 1.0.2" in the method block"); tasks BENCH:128, :34-36 (a canonical prompt and two paraphrases, one per repetition), analysis (9 families of 15 runs, `R1`); conditions `README.md@26d7b19:382` ("the same tasks, phrasing and turns, and the same 15-minute limit"), BENCH:146 (a fresh evaluation home per cell; Claude Code: web tools off, a scratch home), `benchmarks/drivers/pebble_cell.py@main:1-5` (each cell in its throwaway folder; "never web"), BENCH:44, :300 (frozen pages given as files); autonomy BENCH:145; grading BENCH:58 ("Graders see the replies and the workspace, never the product name"), :149 ("only `passed` is success"), :54-55 (a run with any failed check is a failure); fixed in advance BENCH:147 ("registered and stamped before the first cell"), :149, analysis `counting` (270 planned, 0 not run), `README.md@26d7b19:381` (verbatim) | Q. The line "Pebble {version}, the latest release, hasn't been measured yet." appears only when `src/lib/release.ts` offers a version that isn't 1.0.2, 1.0.3 (never published alone, STATUS 17:34) or 1.0.4 (I) |
| C-BENCH-4 | Success, of 135 runs each: Pebble 1.0.2 79.3 % (107 of 135), 95 % interval 68.1 to 88.9; Claude Code 2.1.309 82.2 % (111 of 135), 71.9 to 91.9 (the chart's values and the figure's caption) | BENCH:157; analysis `summary.*.passed`, `success`, `success_cluster95` | Q. The chart is the section's own drawing of these numbers (PHILOSOPHY "Evidence, presented"), not Pebble's SVGs |
| C-BENCH-5 | "The difference pairs each run with its twin over the 120 runs of the eight compared families; the five delegation tasks are reported but not compared, so it isn't simply 79.3 minus 82.2." "Lines show 95 % intervals, from a bootstrap over tasks." The chart's axis labels "Claude Code ahead" and "Pebble ahead" | analysis `paired.pairs` (120), `claims.descriptive` (["delegation"]), `families.delegation.scope` ("descriptive"); BENCH:175 ("Delegation (descriptive)"), :149-150 ("95 % task-cluster bootstrap") | D. (107 − 15) − (111 − 15) = −4 of 120 = −3.3 points; delegation is 15 of 15 for both. The axis labels name the two directions of "Pebble minus Claude Code" |
| C-BENCH-6 | "Correction, 23 October 2026. The harness missed two clarifying questions that Claude Code asked, and both runs were scored as failures. The clarification comparison is withdrawn. With those two runs counted for Claude Code, its overall result is at most 83.7 %; the verdict is unchanged." and the link "Read the correction" | BENCH:205-220 ("Corrections after publication"); STATUS 21:29; OVERRIDES §18 (its suggested note, nearly word for word) | Q. (111 + 2) / 135 = 83.7 %. No clarification row and no clarification figures anywhere (OVERRIDES §18; the tests fail on 53.3, 33.3 or +20.0) |
| C-BENCH-7 | Ahead: "Multi-turn success" 88.9 % (32 of 36) against 80.6 % (29 of 36); "The 36 runs per product with follow-up turns. No interval is published for this measure." | BENCH:159 (the measure's own name); analysis `summary.*.R2` (`multi_turn_cells` 36; success 0.8889 and 0.8056); STATUS 21:29 (""Ahead on multi-turn" still holds"); OVERRIDES §18 (label the measure as the doc does; never the family row, which is 100.0 % for both) | Q, D (the counts: 0.8889 × 36 = 32, 0.8056 × 36 = 29). The analysis computes no interval for R2 |
| C-BENCH-8 | Behind: "Coding fixes" 80.0 % (12 of 15) against 93.3 % (14 of 15); "Paired difference −13.3 points (−26.7 to 0.0)." | BENCH:167; analysis `families.coding_fix` | Q |
| C-BENCH-9 | Behind: "Research" 0.0 % (0 of 15) against 20.0 % (3 of 15); "Paired difference −20.0 points (−46.7 to 0.0), with a strict citation grader." The note "Research is graded strictly. The grader, fixed before the run, fails a reply that also cites the out-of-date page it set aside, and most misses on both sides were right answers that did. Pebble cites more of what it checked, a habit worth changing." | BENCH:170, :186-189 | Q |
| C-BENCH-10 | Behind: "False completions" 21 of 135 against 17 of 135; "Runs that presented a finished result while a check failed." | BENCH:158, :55-57 ("False completion is symmetric: the product presented a finished result and a substantive check failed"); analysis `summary.*.false_completions` | Q. A loss, at the same weight as the lead (OVERRIDES §18) |
| C-BENCH-11 | Also measured: "Phrasing" 82.2 % and 75.6 % against 80.0 % and 80.0 % ("The main wording, then the weakest of the three phrasings."); "Time per run" 10.9 s and 39.9 s against 9.7 s and 17.6 s ("The median, then the 95th percentile."); "Time is a secondary measure: both products ran side by side on one Mac." | BENCH:160-161, :201; analysis `R1`, `R3` | Q |
| C-BENCH-12 | "Each family is 15 runs, so its interval is wide, and every family's interval reaches zero." | analysis `families.*.paired.cluster95` (every lower bound ≤ 0 ≤ every upper bound); `families.*.products.*.cells` (15) | D. `benchmarks.test.ts` checks it |
| C-BENCH-13 | "One of Claude Code's 17 false completions asked the right question, then ended with "FINAL: done"; the rule fixed before the run counts that line as a claim that the task was finished." | BENCH:196-200 | Q |
| C-BENCH-14 | "Per task, at list prices: Pebble $0.085, Claude Code $0.053." "One formula prices both products' tokens at Anthropic's list prices for Claude Opus 5.5, read on 23 October 2026. Pebble's figure is an upper bound." "Claude Code ran on a subscription; its own API-equivalent figure for the whole run is $11.74." "Cost is reported here, not claimed." | BENCH:162, :190-192; analysis `cost_usd` (11.536 / 135 = 0.0855; 7.0994 / 135 = 0.0526), `versions.*.reported_cost_usd` (Claude Code's nine batches, 11.7421 in all), `cost_note`, `claims.not_claimed` ("monetary cost (reported, never claimed)"); OVERRIDES §18 ("Print the caveat beside the numbers") | Q |
| C-BENCH-15 | "Pebble sends fewer tokens per task, but only 1.4 % of its input came from the prompt cache, against 87.8 % for Claude Code: it rebuilds its task notes at the start of the conversation on each step. Moving them to the end is its next change." | BENCH:163, :193-195; `README.md@26d7b19:383-384` ("That is the next change."); analysis `R4.cached_input_share` | Q |
| C-BENCH-16 | "What this doesn't prove": anything beyond these 45 tasks ("They are the project's own tasks and graders, published for anyone to read; this is not an independent benchmark."); other products or models, or live web search; the quality of either interface; security, or what AgentGuard adds on its own ("it ran in every Pebble run, as it does in the app, and this comparison doesn't isolate it. That test is still to come."); cost or speed ("both are reported, not claimed") | analysis `claims.not_claimed` (other products or models; live web search; UI quality; monetary cost (reported, never claimed); any task outside 24a; any security property); BENCH:292-302, §1 (the project's own corpus 24a and graders, published in `benchmarks/`); `benchmarks/drivers/pebble_cell.py@main:3` ("The App is the real one (controller, runner, broker, AgentGuard, memory, views)"); `README.md@26d7b19:389-390` (the AgentGuard ablation is "still to come"); BENCH:201 (time is secondary) | Q, D. Nothing about the Codex run (OVERRIDES §18) |
| C-BENCH-17 | Links: "Read the full results" and "The full results: the setup, every family, the cost and the harness fixes" (`…/blob/main/docs/PEBBLE_V1_BENCHMARKS.md#5b-pebble-against-claude-code-cli-24a-claude-opus-55`), "Read the correction" (`…#corrections-after-publication`), "The analysis behind every number: names, counts and timings, no replies or files" (`…/blob/main/docs/benchmarks/claude-opus-5-5/analysis.json`), "The tasks, the graders and the runner, to run it again" (`…/tree/main/benchmarks`), "The charts" (`…/tree/main/docs/benchmarks/claude-opus-5-5`) | Each returned HTTP 200 on 2026-10-24 at 00:13 IST; BENCH:181-182 ("content-free: names, counts and timings, never a reply or a file"); `README.md@26d7b19:372`, `:388` (the anchors) | I. On `main`, not the `v1.0.4` tag: the tag's copy predates the correction (OVERRIDES §18) |
| C-BENCH-18 | "Run on 23 October 2026, on Pebble 1.0.2." | BENCH:3 ("(§5b, 2026-10-23)"), :142 | Q |
| C-SYS-17 | Rail label "Benchmarks / Measured, not claimed" | `README.md@26d7b19:366` ("## Benchmarks: measured, not claimed"); the lead's name for the section | Q. Label (C-SYS-16 is the film lane's) |

### The copy lint and the competitor's name

`tools/qa/copy-lint.mjs` flags "Claude Code" everywhere. OVERRIDES §11, §16 and §18 allow the comparison in one
place, so the lint exempts the competitor-name rule (and only that rule) inside the `#benchmarks` section, inside
`llms.txt`'s "## Benchmark" block and in `src/content/benchmarks.ts`. "Better", "faster", "beats" and every other rule
still apply there.

### Changed elsewhere (v2 sections B)

| Where | Before | After | Rows |
|---|---|---|---|
| `copy.ts` `release` and every fallback that reads it (hero facts, calls to action and their labels, sticky pill, Install, final call to action, JSON-LD defaults) | 1.0.1, 71,805,116 bytes, 22 October 2026 | 1.0.4, 71,808,389 bytes, 23 October 2026, from `releaseFacts.ts` | C-REL-1..5 |
| `copy.ts` `infrastructure.facts`, `openSource.tested` | 8,421 tests; 1,772 checks across 40 suites; v1.0.1 | 8,653; 1,840 across 45; v1.0.4, from `releaseFacts.ts` | C-INF-2, C-INF-3, C-OSS-2 |
| `copy.ts` `infrastructure.note` | "… No benchmark results have been published yet." | the first sentence only | C-INF-6 |
| `copy.ts` `memory.settingsCaption` | "… in Pebble 1.0.1." | "… in Pebble 1.0.4." | C-F2B-1 |
| `seo.ts` `llmsTxt` | "Version 1.0.1, the first public release, came out on 22 October 2026."; "No benchmark results have been published …" | "Pebble 1.0.4 came out on 23 October 2026."; the "## Benchmark" block while the gate is open | `llms.txt` row |
