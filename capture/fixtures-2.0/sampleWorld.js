// The sample world as the 2.0 harness fixtures use it (DRAFT; film-2.0 only). Fictional: a small pottery studio,
// "Clay & Current", getting ready for its open day (TREATMENT §3.3). capture/sample-world-2.0/world.json is the
// source of truth: check.mjs fails if a message here differs from it.
//
// What is ours (sample data): the person's messages, the model's replies, file names, diffs, memories, view data and
// numbers. Model replies are illustrative here; in the film, a reply is either a real take or harness playback of a
// real 2.0.0 run's own words (TREATMENT §3.6, F07). Numbers are sample values, never measurements of Pebble.

export const HOME = "/Users/studio"; // the demo macOS user (world.json demo_user)
export const PROJECT = HOME + "/Projects/studio-bookings";
export const OPEN_DAY_FOLDER = HOME + "/Documents/Open day";
export const WORKBENCH = HOME + "/Pebble Workbench";
export const STUDIO = "Clay & Current";

export const MESSAGES = {
  quick: "What can you do now?",
  openDay: ["Play our glazing video on YouTube.", "Play the next one."],
  tickets: "What's 48 × 12.5? Use Calculator.",
  kilnBoard: "In Kiln Board, start the bisque program.",
  notesDelete: "Delete the note “Old price list (2025)” in Notes.",
  appActions: [
    "Run my Open day checklist shortcut.",
    "Play the Studio playlist in Music.",
    "Make a note: kiln unload at 9:00, glaze table ready by 9:30.",
    "Add “Glaze order” to my calendar on Monday at 9:00.",
    "Show the Open day folder in Finder.",
  ],
  photos: ["Resize the open-day photos in Pictures to 1600 px for the website.", "Put Saturday's hours in the flyer: 10:00 to 16:00."],
  bookings: "Saturday's wheel tasters are taking one booking too many. Stop a full slot from taking another booking.",
  bookingsGoAhead: "Looks right. Go ahead.",
  glaze: "Scale the celadon glaze in Documents/Open day/glazes/celadon.csv to a 5 kg batch, and keep the tool for next time.",
  kiln: "How long will Friday's bisque firing take? The kiln starts at 20 °C. Ramp 1: 80 °C an hour up to 600 °C. Ramp 2: 150 °C an hour up to 1000 °C, then hold for 15 minutes. I fire every week with different ramps, so make a small tool for it and call it kiln_ramp_time.",
  remember: "Remember that the kiln needs half an hour to cool before anyone opens it.",
  forget: "Forget the old price list.",
  goal: "/goal Open day ready",
};

// ---- studio-bookings (HS-F, S18): the bug, the fix and the tests --------------------------------------------------
export const BOOKINGS = {
  changed: ["studio_bookings/slots.py"],
  covering: ["tests/test_slots.py"],
  tests: { passed: 18, failed: 0, skipped: 0, errors: 0, total: 18 }, // measured on the sample project (MANIFEST checks)
  output: "..................                                                       [100%]\n18 passed in 0.03s",
  diff: `@@ -34,7 +34,7 @@ class Slot:
         """Book one place under a reference such as "T07"."""
         if reference in self.bookings:
             raise ValueError(f"{reference} is already booked on {self.label}")
-        if self.booked > self.places:
+        if self.is_full():
             raise SlotFull(self.label)
         self.bookings.append(reference)
 `,
  replyProposed: `Found it. \`Slot.book()\` in \`studio_bookings/slots.py\` checks \`self.booked > self.places\`, so a slot that is already full still takes one more booking.

I've drafted a one-line fix: a full slot now raises \`SlotFull\`. Nothing changes until you approve the edit.`,
  replyHeldModel: `The fix is in: \`Slot.book()\` in \`studio_bookings/slots.py\` now refuses a booking once the slot is full, so Saturday's wheel tasters stop at twelve.`,
  continueVerified: "\n\nThe tests ran in a temporary copy of your project: **18 passed**. The fix is verified, and a full slot no longer takes another booking.",
};

// ---- Photos (HS-H, S15-S16): the command and the file change ------------------------------------------------------
export const PHOTOS = {
  command: "sips -Z 1600 ~/Pictures/Open\\ day/*.jpg --out ~/Pebble\\ Workbench/open-day-1600",
  output: "/Users/studio/Pictures/Open day/black-glaze-teapot.jpg\n  /Users/studio/Pebble Workbench/open-day-1600/black-glaze-teapot.jpg\n…",
  files: ["black-glaze-teapot.jpg", "raku-kiln.jpg", "red-teapot.jpg", "stacked-pots.jpg", "table-setting.jpg",
    "tan-glaze-teapot.jpg", "teal-mug.jpg", "terracotta-pots.jpg"],
  flyer: OPEN_DAY_FOLDER + "/flyer.md",
  flyerDiff: `@@ -5,5 +5,5 @@ # Open day at Clay & Current
 Come and get your hands in the clay. Try the wheel, watch a glaze go on, and see what came out of the kiln.

-**Hours:** to be confirmed
+**Hours:** 10:00 to 16:00

 ## What's on
`,
  replyResized: "I made 1600 px copies of the eight open-day photos in Pebble Workbench, in `open-day-1600`. The originals in Pictures are unchanged.",
  replyFlyer: "The flyer now says **Hours: 10:00 to 16:00**.",
};

// ---- The Workshop (HS-G, S23-S24) -----------------------------------------------------------------------------------
export const WORKSHOP = {
  kilnAnswer: "Friday's bisque firing takes **10 hours 10 minutes**: 7 h 15 min to reach 600 °C, 2 h 40 min more to reach 1000 °C, and the 15-minute hold.",
  kilnTool: "kiln_ramp_time",
  kilnCode: `def kiln_ramp_time(start_c, segments):
    """Minutes for a firing: start temperature, then (rate in °C an hour, target °C, hold in minutes) per ramp."""
    minutes, current = 0.0, float(start_c)
    for rate, target, hold in segments:
        minutes += abs(target - current) / rate * 60 + hold
        current = float(target)
    return round(minutes)`,
  glazeAnswer: "For a 5 kg batch of the celadon: potash feldspar 1250 g, silica 1250 g, whiting 1000 g, kaolin 1000 g, talc 500 g, and red iron oxide 50 g on top.",
  glazeTool: "scale_glaze_recipe",
};

// ---- Memory (HS-D, S17) -----------------------------------------------------------------------------------------------
export const MEMORIES = {
  profile: [
    { id: "pebble-md", origin: "curated", content: "I run a small pottery studio. Keep answers short, with the numbers first." },
    { id: "mem-pref-1", origin: "direct-user", content: "Uses metric units and 24-hour times." },
    { id: "mem-pref-2", origin: "auto-learned", content: "Prefers temperatures in °C and weights in grams." },
  ],
  semantic: [
    { id: "mem-fact-1", origin: "direct-user", content: "The open day is on Saturday, from 10:00 to 16:00." },
    { id: "mem-fact-2", origin: "direct-user", content: "The kiln needs half an hour to cool before anyone opens it." },
    { id: "mem-fact-3", origin: "auto-learned", content: "The old price list (2025) was replaced by the new one." },
  ],
  procedural: [{ id: "mem-proc-1", scope: "project", origin: "auto-learned", content: JSON.stringify({ recipe: "python -m pytest -q", language: "Python" }) }],
  temporal: [{ id: "mem-temp-1", origin: "direct-user", content: "Bisque firing on Friday at 18:00." }],
};

// ---- Views (HS-M, tour): the open day's dashboard and a quiz -------------------------------------------------------
export const DASHBOARD = {
  title: "Open day bookings",
  panels: [
    { id: "sold", title: "Wheel taster tickets", kind: "metric", data: { value: 48, unit: "of 48", caption: "sold out" } },
    { id: "takings", title: "Ticket takings", kind: "metric", data: { value: 600, unit: "£", caption: "48 × £12.50" } },
    { id: "by-session", title: "Places by session", kind: "chart",
      data: { type: "bar", x_key: "session", y_keys: ["booked", "places"], labels: { booked: "Booked", places: "Places" },
        rows: [{ session: "10:30", booked: 12, places: 12 }, { session: "12:00", booked: 12, places: 12 },
          { session: "13:30", booked: 12, places: 12 }, { session: "15:00", booked: 12, places: 12 }], caption: "Wheel tasters" } },
    { id: "to-do", title: "Still to do", kind: "table",
      data: { columns: [{ id: "item", label: "Item" }, { id: "when", label: "When" }],
        rows: [{ item: "Print the price list", when: "Friday" }, { item: "Unload the kiln", when: "Saturday, 9:00" }] } },
  ],
};
export const QUIZ = {
  title: "Glaze table safety",
  questions: [
    { id: "q1", question: "What do you wear when you mix dry glaze materials?", choices: ["A dust mask", "Nothing extra", "Sunglasses", "Gloves only"] },
    { id: "q2", question: "Where does glazed ware go before firing?", choices: ["On a clean shelf, not touching", "Stacked together", "On the kiln lid", "In a bag"] },
    { id: "q3", question: "How long does the kiln cool before anyone opens it?", choices: ["Half an hour", "Five minutes", "No time at all", "A week"] },
  ],
};
