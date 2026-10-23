# Claims register

Every factual sentence on the site, in the film's on-screen text and transcript, in `llms.txt` and in the metadata,
mapped to its source. The copy lives in `src/content/` (`copy.ts`, `faq.ts`, `credits.ts`, `chapters.ts`, `seo.ts`);
the `[C-…]` tags in those files are the IDs below. Written by Lane A on 2026-10-22 (IST). Checked sentence by sentence
and updated by the claims review on 2026-10-23: changed rows say "(review)", new rows are in "Claims review
(2026-10-23)" at the end, and every edit is logged with its reason in `.work/handoffs/HANDOFF-claims-review.md`.

**Rule:** a sentence that cannot be traced here is rewritten or removed (MASTER_PLAN §9.3). Headings, button labels,
greetings and other sentences that state no fact ("You set the pace.", "Say hi to Pebble.") need no row.

## How to read the sources

| Notation | Means |
|---|---|
| `README.md@v1.0.1:12` | Line 12 of that file at tag `v1.0.1` of github.com/tohin003/Pebble (raw: `https://raw.githubusercontent.com/tohin003/Pebble/v1.0.1/README.md`). Tag copies are immutable. Every file cited here is byte-identical to the read-only checkout `PEBBLE_REPO` (checked with `cmp` at 23:45 IST), **except `README.md`**: the release session is rewriting the checkout's README as a showcase page (393 lines at 23:38), so README citations use the 162-line tag copy. |
| `README.md@207ec74:98` | Line 98 of the README published on `main` at commit `207ec74` (the release session's showcase README, 494 lines; raw: `https://raw.githubusercontent.com/tohin003/Pebble/207ec7400abd9d01720d8bba0b091b5a8948bc7e/README.md`). The release session gives its statements as true (STATUS 23:32, 00:00). Used for the showcase facts that the v1.0.1 tag README lacks. The checkout now also holds unreleased 1.0.2 work (`CHANGELOG.md`, `App.vue`, `AdvancedSettings.vue` differ from the tag), so 1.0.1 behaviour is still cited from the tag copies. |
| `STATUS §Release facts`, `STATUS 23:27` | `/Users/xyx/Projects/PEBBLE_SESSIONS_STATUS.md`: the "Release facts" section, or the release session's update at that time. |
| `OVERRIDES §n`, `PLAN §n` | The landing session's planning docs (`OVERRIDES.md`, `MASTER_PLAN.md`; copies in `.work/research/`). |
| `fixtures.js` | U2's capture fixtures (`capture/mock/fixtures.js`): the fictional demo world (Maya, invoice-kit, Lisbon trip, datetime quiz). |

**Kinds:** **V** = Pebble's own interface text, word for word. **Q** = a doc sentence quoted or lightly trimmed (same
meaning, same qualifiers). **D** = derived from the cited lines; the reasoning is in the notes. **S** = sample data,
always shown with "Shown with sample data." **I** = a fact about this site, checked by the QA gates (§9.2).

---

## Release facts

| ID | Claim on the site | Source | Kind / notes |
|---|---|---|---|
| C-REL-1 | Pebble 1.0.1 (version, `v1.0.1`) | STATUS §Release facts ("Tag `v1.0.1`"); `README.md@v1.0.1:12`; `CHANGELOG.md@v1.0.1:4` ("Pebble 1.0.1 is the first public release") | Q. `release.ts` may replace it with the latest tag at build time |
| C-REL-2 | "72 MB" (71,805,116 bytes) | STATUS 23:27 ("71,805,116 bytes = 71.8 MB … show "72 MB""); OVERRIDES §1 | Q. Decimal MB, rounded |
| C-REL-3 | Released 22 October 2026 | STATUS 23:27 (PUBLISHED); OVERRIDES §1 | Q |
| C-REL-4 | `curl -fsSL https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh \| bash` | STATUS §Release facts ("Show the install command exactly"); OVERRIDES §1; `README.md@v1.0.1:22` | V (exact). STATUS 23:27: the installer passed against the live release |
| C-REL-5 | "v1.0.1 · 72 MB · Apple silicon · macOS 12 or later" | OVERRIDES §1 (example line); `README.md@v1.0.1:17` | Q |

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
| C-LIM-10 | Pebble for Chrome isn't in the Chrome Web Store for 1.0: you load it in Chrome's Developer mode. Pebble's own built-in browser is not available yet. | `README.md@v1.0.1:123-124`, `:155`; `docs/USER_GUIDE.md@v1.0.1:200-201`; `CHANGELOG.md@v1.0.1:95` | Q |
| C-LIM-11 | Scheduled tasks run only while Pebble is open. | `README.md@v1.0.1:156`; `docs/USER_GUIDE.md@v1.0.1:182` | Q |
| C-LIM-12 | Web search uses Bing's RSS feed, which may change or stop without notice. The free Open-Meteo weather service is for non-commercial use. | `README.md@v1.0.1:153-154`; `NOTICE.md@v1.0.1:59-61` | Q |
| C-LIM-13 | Pebble honours Reduce Motion, and VoiceOver hears the state of every switch, tab and permission mode, but an accessibility audit is still to come. | `docs/USER_GUIDE.md@v1.0.1:28`; `CHANGELOG.md@v1.0.1:76-77`; `docs/ARCHITECTURE.md@v1.0.1:51` ("an accessibility audit … remain necessary") | Q |
| C-LIM-14 | Other software on your Mac: Pebble doesn't defend against other software running as your own macOS user. Such software can read Pebble's data folder and change its settings, and it could make Pebble's backend use a saved key or sign-in without a prompt. | `SECURITY.md@v1.0.1:57` ("Pebble does not defend against other software running as your own macOS user. Such software can read Pebble's data folder and change its settings, and it can start Pebble's own backend so that the backend reads your saved API key or ChatGPT sign-in without a prompt …"); DESIGN §9 (lead decision: the limits add it) | Q. Shortened; "could" because it describes what such software is able to do |

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
| C-CH-6 | "Done means tested" | `docs/USER_GUIDE.md@v1.0.1:120-121` | Q (headline form of the completion check) |
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
| C-MOD-1 | Connect a model in Settings › Models. One model runs at a time, and you pick the model and its effort for each message. | `README.md@v1.0.1:76`; `docs/USER_GUIDE.md@v1.0.1:62-63` | Q |
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
| C-PROJ-9 | (04) A task that changed code must have a passing test run of those changes before Pebble calls it finished. Written JSON and CSV files must parse. When the evidence is missing, the task is held at "verification required", and you choose what happens next. | `docs/USER_GUIDE.md@v1.0.1:120-122` | Q |
| C-PROJ-10 | AgentGuard checks evidence; it is not a security layer. | `docs/USER_GUIDE.md@v1.0.1:123` | Q (verbatim) |
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
| C-EXP-4..7 | The three modes' names, "Runs without asking" and "Always asks" texts, and the "In every mode, …" sentence | `src/permissionModes.ts@v1.0.1:20-38`, `:42`; labels `AdvancedSettings.vue@v1.0.1:1383-1384`; legend "How Pebble acts" from `AdvancedSettings.vue@v1.0.1:1365` ("HOW PEBBLE ACTS", set in sentence case per PLAN §7.1) | V. The app keeps these true with a test (`permissionModes.ts:1-5`) |
| C-EXP-8 | "The default" (on Ask for approval) | `README.md@v1.0.1:112`; `src/permissionModes.ts@v1.0.1:44-46` | Q |
| C-EXP-9 | Below the modes, in Settings › Permissions, a switch for each kind of tool turns it off entirely. | `docs/USER_GUIDE.md@v1.0.1:92-94` | Q. Explains the app sentence's "switches below" on a page that has none |
| C-EXP-10 | "Full access increases the impact of mistakes and prompt injection. AgentGuard is a reliability check; it cannot guarantee that every command or answer is safe." | `src/components/AdvancedSettings.vue@v1.0.1:1389-1393` (shown when Full access is selected) | V. Allow-listed (contains "safe") |
| C-EXP-11 | Forget card: "Saved memories about “…”"; "Nothing is forgotten until you choose Forget. These are records Pebble saved; forgetting one removes it for good."; "Forget"; "Forgotten"; "All memories in Settings"; "Done"; the aria label "Forget: …" | `src/App.vue@v1.0.1:2057`, `:2059`, `:2066`, `:2071`, `:2075`, `:2081-2082` | V |
| C-EXP-12 | "In this project" (where a memory applies) | `src/App.vue@v1.0.1:1479` | V |
| C-EXP-13 | The three memories and the request "Forget what you know about invoice-kit." | `fixtures.js` (`mem-pref-4`, `mem-fact-1`, `mem-proc-1`) | S |

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
| C-MEM-3 | Start a message with "Remember that …" to save a preference. Pebble still answers the rest. | `docs/USER_GUIDE.md@v1.0.1:150-151` | Q |
| C-MEM-4 | Ask Pebble to forget something and it shows the memories that match. Nothing is forgotten until you confirm it in the main window. | `docs/USER_GUIDE.md@v1.0.1:155-156`; `CHANGELOG.md@v1.0.1:34` | Q |
| C-MEM-5 | Write what Pebble should know about you in `~/.pebble/PEBBLE.md`, in your own words. It is information about you, never a permission. | `docs/USER_GUIDE.md@v1.0.1:157-158` | Q |
| C-MEM-6 | One switch, Remember useful context, turns memory off. Forgetting removes a memory for good. | `docs/USER_GUIDE.md@v1.0.1:162`; `src/App.vue@v1.0.1:2059` ("forgetting one removes it for good") | Q |
| C-VIEW-1 | Ask for a dashboard, a table, a chart, a plan, a diagram, a quiz or an app demo. Pebble builds it as a view in the conversation, from data, and keeps its earlier versions. | `docs/USER_GUIDE.md@v1.0.1:167-168` | Q |
| C-VIEW-2 | A quiz keeps its timer and your answers. | `docs/USER_GUIDE.md@v1.0.1:169` | Q |
| C-VIEW-3 | Export a view as PDF, Word, Excel, CSV or HTML. Saving always goes through the macOS Save dialog, and nothing is uploaded. | `docs/USER_GUIDE.md@v1.0.1:171-172` | Q |
| C-VIEW-4 | A view can show and collect things, but it can never approve, run or change anything. | `README.md@v1.0.1:118-119` | Q (verbatim) |

## 8. And a little more

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-MORE-1 | Pebble reads public pages as text; their scripts never run. Searches send your search words to Microsoft Bing's RSS results feed. | `docs/USER_GUIDE.md@v1.0.1:127-128` | Q |
| C-MORE-2 | Everything read from the web is untrusted data: a page can never give Pebble an instruction or a permission. | `docs/USER_GUIDE.md@v1.0.1:132-133` | Q |
| C-MORE-3 | Pebble can hand parts of a larger task to agents, track a goal with criteria, and run reviewed schedules. Agents read and propose; only the main task applies changes, through your normal review. | `docs/USER_GUIDE.md@v1.0.1:176-181`; `README.md@v1.0.1:120-121` | Q |
| C-MORE-4 | Skills (reusable instructions in Markdown) and connectors (MCP servers over HTTP). Each one starts turned off until you review it. | `docs/USER_GUIDE.md@v1.0.1:187-192` | Q |
| C-MORE-5 | Every connector call asks for your approval. Servers started through npx, uvx or Node aren't supported yet. | `docs/USER_GUIDE.md@v1.0.1:192-193` | Q |
| C-MORE-6 | Pebble can look at and act in a Chrome tab you share and grant, one site at a time. Sign-in, password and payment pages are handed back to you unread. | `README.md@v1.0.1:123`; `docs/USER_GUIDE.md@v1.0.1:200`, `:221` | Q |
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
| C-INST-9 | Options `--dry-run` (shows what it would do; nothing changes), `--version 1.0.1`; read the installer first: download it, read it, run `bash install.sh`. | `README.md@v1.0.1:40-49` | Q |
| C-INST-10 | The installer downloads with curl, which doesn't quarantine files, so macOS opens Pebble without the first-run warning. | `README.md@v1.0.1:69` | Q |
| C-INST-11 | By hand: download the zip and `SHA256SUMS`; `shasum -a 256 -c SHA256SUMS` should print `Pebble-macos-arm64.zip: OK`; drag `Pebble.app` to Applications; the first-run steps. | `README.md@v1.0.1:53-60` | Q |
| C-INST-12 | The first time, with no model connected, Pebble opens its full window with a welcome: Connect your ChatGPT account, or Use a local model. After that, Pebble starts as the pebble. | `README.md@v1.0.1:73-75`; labels `src/App.vue@v1.0.1:1893`, `:1897` | Q, V |
| C-INST-13 | `--uninstall` moves `Pebble.app` to `~/PebbleBackups` and lists what Pebble keeps on your Mac. Your data is never touched. | `README.md@v1.0.1:95-100`; STATUS 23:27 (`--uninstall` "moved the app aside and deleted nothing") | Q |
| C-INST-14 | Quit Pebble and run the installer again. It keeps the previous app in `~/PebbleBackups` and leaves your data where it is. Pebble 1.0 doesn't check for updates by itself. | `README.md@v1.0.1:88-91` | Q |

## 11. Open source and FAQ

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-OSS-1 | Pebble's code is on GitHub under the Apache License 2.0. Read it, build it yourself from a clean clone, or help improve it. | `README.md@v1.0.1:12`, `:142`; STATUS 23:27 (source pushed to `main`) | Q |
| C-OSS-2 | Before release, Pebble 1.0.1 passed 8,421 automated tests and 1,772 service checks. The tests never call a model or the network. | STATUS 22:50 ("Phase 26: 8,421 tests; 1,772 service checks") and 23:32 (showcase brief: "true statements to use"); `CONTRIBUTING.md@v1.0.1:50`; `README.md@207ec74:98`, `:323-324` | Q. (review) Watch item closed: the published README keeps both numbers. The 02:51 numbers (8,501 tests, 1,788 checks) belong to the unpublished 1.0.2 trial and must not appear |
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
| C-FAQ-13 | AgentGuard is a reliability check, not a security layer … a task that changed code must have a passing test run of those changes, and written JSON or CSV files must parse. | `docs/USER_GUIDE.md@v1.0.1:120-123`; `src/App.vue@v1.0.1:2876-2877`; `SECURITY.md@v1.0.1:54` | Q |
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
| — | `llms.txt` lines | (review: adds the macOS 27 qualifier, "through OpenAI's preview", the AgentGuard evidence layer and scope challenge (C-AG-7, C-FAQ-14), the five "What leaves the Mac" destinations (C-PRIV-6..9, C-PRIV-12) and the sandbox / prompt-injection limit (C-LIM-9)) The rows above: C-HERO-2, C-MOD-2..7, C-PROJ-1, C-PROJ-9, C-PROJ-10, C-MEM-1, C-VIEW-1, C-VIEW-4, C-PRIV-*, C-LIM-*, C-REL-4; "the first public release": `CHANGELOG.md@v1.0.1:4`; "No benchmark results have been published, and Pebble makes no speed or quality comparison with other tools": STATUS §Release facts ("Benchmarks. None are published yet."), OVERRIDES §2 | Q |

## LinkedIn post draft (`.work/social/linkedin-post.txt`, not committed)

| Claim in the post | Source |
|---|---|
| Pebble 1.0.1 is the first public release | C-REL-1; `CHANGELOG.md@v1.0.1:4` |
| A small AI companion for Macs with Apple silicon; click it to chat, or open the full window to work on a project | C-HERO-2, C-HERO-5 |
| (review) An eligible ChatGPT Plus or Pro plan (through OpenAI's preview), an API key, or a model file that runs on your Mac | C-MOD-2..7; OVERRIDES §8 H14 |
| In the default mode, every edit is a card you approve, with Undo; tests run in an isolated copy | C-PROJ-1, C-PROJ-3, C-PROJ-5 |
| Before Pebble calls a coding task finished, AgentGuard checks that tests of the changed code have passed. (review) It checks evidence; it isn't a security layer | C-PROJ-9, C-PROJ-10 |
| Free and open source under the Apache License 2.0, with no telemetry | C-FAQ-1, C-PRIV-5 |
| (review) Signed with its own identity rather than an Apple Developer ID, and not notarized; Apple silicon only; no independent security audit yet | C-LIM-1, C-LIM-2, C-LIM-5, C-LIM-4 |
| (review) Links: the release page `https://github.com/tohin003/Pebble/releases/tag/v1.0.1` (OVERRIDES §4 asks for "the GitHub release") and the repository | STATUS §Release facts |

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
| C-F1-3 | (review) "Signed with its own identity, not an Apple Developer ID, and not notarized. The checksum shows the download is intact, not who made it. No independent security audit yet." (the hero's short honest line, now `copy.ts` `hero.honestLine`) | OVERRIDES §2 (all four limits "near the download CTA in short form"); DESIGN §5 row 1; C-LIM-1..4 | Q. The review added limit 3, which the DESIGN wording left out |
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
| C-AG-5 | Heading "Evidence before “done”." | `README.md@207ec74:107` ("AgentGuard: evidence before "done"") | Q. The README's story (OVERRIDES §7); step 04 keeps "Done means tested." |
| C-AG-6 | "An agent shouldn't grade its own work." | OVERRIDES §2 | Intent: the one allowed comparative framing |
| C-AG-7 | AgentGuard is built into Pebble as an evidence layer between the model and your project. | STATUS 23:32 ("an evidence layer between the model and your project"); `README.md@207ec74:110`; `docs/ARCHITECTURE.md@v1.0.1:29` ("a verification and evidence layer, not a security layer") | Q |
| C-AG-8 | It indexes your project and grounds each request in the files that request reaches. It challenges an agent that drifts outside that scope, and flags invented or broken dependencies. | STATUS 23:32; `README.md@207ec74:63`, `:110-111`; `docs/ARCHITECTURE.md@v1.0.1:23` | Q |
| C-AG-9 | It reads test results as Pebble observed them, never as the model reports them. When a task changed code and no fresh passing test run covers the change, Pebble holds it at "verification required": you run the tests, ask Pebble to finish, or accept it as unverified. | `README.md@207ec74:111-112`; `docs/USER_GUIDE.md@v1.0.1:120-122`; `src/components/RunPanel.vue@v1.0.1:121-123` | Q. Not the brief's "resolve with one click": in the default mode, Run the tests opens a "Run isolated tests" card that asks again (FILM_SPEC S5c–S5d) |
| C-AG-10 | When a task keeps changing files its request doesn't reach, AgentGuard stops the next write. The model must explain what connects them, or split them into a separate change. | OVERRIDES §9; STATUS 23:38 ("the proposed write never runs"); `backend/vendor/agentguard/validate/checks.py:72`, `:81`, `:93-94`; `core/taskstate.py:22` (`DEFAULT_UNRELATED_LIMIT = 5`) | Q. "keeps changing": the challenge fires once 5 changed files fall outside the task |
| — | "AgentGuard: AgentGuard — evidence check" · "{N} file(s) changed that the task does not reach" · "Either explain what connects these to the task, or split them into a separate change." | `backend/pebble/guard.py` `refusal()` (line 1139 at 1.0.1, STATUS 23:38); `backend/vendor/agentguard/challenge/renderer.py:32`; `validate/checks.py:81`, `:93-94` | V (engine text, OVERRIDES §9) |
| C-AG-11 | Reliability, not security. AgentGuard checks evidence; it is not a sandbox and not a security layer. Protection comes from Pebble itself: approvals happen only in Pebble's main window; commands run without a shell in macOS's sandbox, which limits them but is not a promise against every attack; nothing a model, a web page, a file or a generated view says can widen what Pebble may do. | `README.md@207ec74:137-140`; `README.md@v1.0.1:8-10`, `:150-152`; `SECURITY.md@v1.0.1:50-54`; `NOTICE.md@v1.0.1:21` | Q. "Protection", not the README's "Safety" (a banned word); no "more reliable" (reads as a comparison) |

### Memory in six layers (`copy.ts` `memory.layers`, `recall`, `relearn`)

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-MEM-7 | Profile (Your preferences), Semantic (Facts & knowledge), Procedural (Procedures), Episodic (Past experiences, up to 1,500 kept automatically), Temporal (Time-sensitive information, each with an expiry), Working (Working context), each with what it holds | OVERRIDES §10; `README.md@207ec74:194-201`; `docs/USER_GUIDE.md@v1.0.1:139-148` | Q. Semantic says only what both sources agree on |
| C-MEM-8 | Each memory reaches the model as labelled data, with where it came from and when, never as an instruction or a permission. | OVERRIDES §10; `README.md@207ec74:190`, `:203-204` | Q |
| C-MEM-9 | Pebble remembers what you forgot, so it doesn't learn it again from the same place. | `docs/USER_GUIDE.md@v1.0.1:154`; `README.md@207ec74:205` | Q |

### Bigger tasks and the tour (`copy.ts` `orchestration`, `tour`)

| ID | Claim | Source | Kind / notes |
|---|---|---|---|
| C-ORC-1 | A task can hand parts to agents, each with steps, time and tokens reserved from the task. Agents read, search, ask and propose; they never write, run commands or call connectors. | `README.md@207ec74:226-228`; OVERRIDES §10 | Q |
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
| C-INF-2 | 8,421 automated tests at v1.0.1, none skipped. They never call a model or the network. | `README.md@207ec74:323`; STATUS 22:50 | Q |
| C-INF-3 | 1,772 service checks across 40 validator suites, each run against the source and the frozen, signed app. | `README.md@207ec74:324`; OVERRIDES §7 | Q |
| C-INF-4 | Reproducible build: the shipped backend is byte-identical to the tested one, apart from its signature. | `README.md@207ec74:325` | Q. (F2b) The page sets the four facts as a ledger under the README's own row names (Tests, Service checks, Reproducible build, Release gates) |
| C-INF-5 | Release gates: a secret scan, a licence inventory, a scan for personal paths, and every published test run in a fresh clone. | `README.md@207ec74:326`; OVERRIDES §7 | Q |
| C-INF-6 | These are facts about how Pebble is built and tested, not benchmarks. No benchmark results have been published yet. | OVERRIDES §2, §7; STATUS §Release facts, 01:17 | Q |

### Alt texts added (`copy.ts` `media.stills`)

`mainApproval`, `heldUnverified`, `mainChallenge` and `settingsMemory` describe lane D's stills in `public/ui/v1/`, as the
review saw them in `capture/shots/page/*-wide-light@3x.png` (kinds I and S). Every string they quote is the app's or the
engine's own (V): "Blocked" and "Pebble's change isn't verified yet." with the three buttons (`RunPanel.vue@v1.0.1:57`,
`:121-123`), and the engine strings under C-AG-10.

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
| C-F2B-1 | "Settings › Memory in Pebble 1.0.1." (the caption under the cropped Settings › Memory still) | Lane D's capture of the 1.0.1 UI, `public/ui/v1/settings-memory-{light,dark}-*.{avif,webp}` (HANDOFF-D-capture); the crop shows the sheet from its title to the third record, untouched | I. Followed by "Shown with sample data." |
| C-F2B-2 | "The card's words are the ones Pebble shows." (under MemoryForgetDemo, after "Interactive example.") | `src/App.vue@v1.0.1:2055-2084` (C-EXP-11, C-EXP-12): heading, note, Forget, Forgotten, All memories in Settings, Done, the "Forget: …" label | I. The demo's three memories and the request are sample data (C-EXP-13). As in the app, Forget gives way to "Forgotten" and Done closes the card |
| C-F2B-3 | The honesty stamp "This page: N cookies, N trackers, N third-party requests" (a list, never a middle-dot string) and its note "A tracker is any request to a known analytics or advertising service, including Vercel's own analytics, and any beacon." | Counted live in the browser (`src/components/shell/Footer.stamp.tsx`): Resource Timing entries plus a PerformanceObserver, `document.cookie`; trackers = a fixed list of analytics and advertising hosts, Vercel's `/_vercel/insights` and `/_vercel/speed-insights`, and `beacon`/`ping` requests | I. Nothing is shown until it has been counted (no JavaScript, no stamp). Lane F2b's QA (`.work/qa/f2b/check.mjs`) read "0 cookies / 0 trackers / 0 third-party requests" on `next start` at 320–1440 px |
| C-F2B-4 | "bloub's code runs in this site's JavaScript, to draw the live pebble, so its MIT licence is reproduced here in full." (/credits) | `src/components/pebble/PebbleLive.tsx` imports the engine from `shared/pebble` (lane B: bloub from Pebble v1.0.1 `src/vendor/bloub/`); critic M10 | I. The text below it is `licences.ts`, checked byte for byte against `shared/pebble/bloub/LICENSE` |
| — | Install's four requirement cells: "Mac: Apple silicon, M1 or later"; "macOS: macOS 12 or later, Built and tested on macOS 27"; "Download: 72 MB, Version 1.0.1"; "Price: Free, A cloud model's costs depend on your provider." | C-INST-2 (with OVERRIDES §8 H14's "tested on macOS 27", always on the Install section), C-REL-1, C-REL-2 (size and version from `release.ts`), C-INST-3 | Q. Same facts as before, split into value and note |
| — | /film: "What you see" (chapters.ts `description`), "On screen" (`onScreen`) and "Sound" (the bracketed cues of `docs/film-captions.json`, mirrored in `src/content/filmCaptions.ts`) | FILM_SPEC §13, §18 (lane E); the claims review's chapters.ts | V/Q. `filmCaptions.test.ts` fails if the mirror drifts from the JSON, or if chapters.ts misses an on-screen line the captions carry |
| — | Install, made as short as design comp 2: "In Terminal, on your Mac:"; "Read the installer first" (links to `install.sh` on GitHub); "Add `-s -- --dry-run` after `bash` to see what it would do. Nothing changes."; "Add `-s -- --uninstall` after `bash` to uninstall it later. The app is moved aside, and your data stays." | C-INST-9 (`README.md@v1.0.1:40-49`: "Options, added after `bash -s --`", "show what it would do; nothing changes"); C-INST-13 | Q. The full commands stay in the README, and the full uninstall command is in the FAQ (C-INST-13). `--version 1.0.1` is no longer on the page |
| — | Install, "Or download it and check it": "Download both into one folder. In Terminal, in that folder, run `shasum -a 256 -c SHA256SUMS`. It should print `Pebble-macos-arm64.zip: OK`.", with "The checksum shows the download arrived intact. It does not prove who made it." right under it; then the drag to Applications, and the first-run steps as one step | C-INST-11, C-LIM-3 (DESIGN §9: the checksum limit next to the shasum step), C-DL-1, C-DL-2, C-DL-3 | Q. The README's five steps, in three |
| — | "Also inside" no longer repeats "Views and exports": the views paragraph right above it says the same (C-VIEW-1, C-VIEW-3) | OVERRIDES §10 | Layout, not a claim |
