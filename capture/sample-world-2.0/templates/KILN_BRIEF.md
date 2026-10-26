# The kiln-timer brief (the Toolbox climax, S24: RS-W, or HS-G playback)

For the lead and the take operator. This is not a file for Pebble: it is the message typed into a fresh conversation
named "Kiln". Never attach this file, paste a path to it, or let Pebble read it.

## The message (type it exactly)

> How long will Friday's bisque firing take? The kiln starts at 20 °C. Ramp 1: 80 °C an hour up to 600 °C. Ramp 2:
> 150 °C an hour up to 1000 °C, then hold for 15 minutes. I fire every week with different ramps, so make a small tool
> for it and call it kiln_ramp_time.

- It asks Pebble to **make** a tool and names it, so the card can read "Kept in Pebble's Toolbox · kiln_ramp_time".
- It never says "keep": whether the tool is kept is Pebble's own decision (CHANGELOG 1.7.0), so a kept card that says
  "on its own" is true.

## The right answer

- Ramp 1: (600 − 20) ÷ 80 = 7.25 hours = 435 minutes.
- Ramp 2: (1000 − 600) ÷ 150 = 2.67 hours = 160 minutes.
- Hold: 15 minutes.
- **Total: 610 minutes = 10 hours 10 minutes.** A take whose answer differs is not used.

## Why the take can end on the kept card (CHANGELOG 1.7.0, read only)

Pebble keeps a tool on its own only if it:
1. passed validation (its own tests and about 50 generated inputs, each run twice, in a fresh sandbox);
2. helped with the task (the answer used it);
3. was made before any web page, file or command output could shape it;
4. passes a blind check (a separate request writes tests from the tool's description alone).

Any other keep asks first (that is the "Glaze" ask card, S23). So, for this take:
- **A fresh conversation**, in no project, started from the companion or the workspace. Nothing before the message.
- **No file, page or command** before the tool is made: everything the tool needs is in the message.
- **The Toolbox empty of this tool:** before each retake, remove kiln_ramp_time in Settings › Skills & connectors
  (Toolbox), and wait out the ten-minute Put back window (1.9.11) if the dry run shows that a removed tool still counts.
- **Past experiences:** if a retake recalls the earlier take ("Recalled N memories" naming the kiln), forget that
  experience in Settings › Memory first, so each take starts the same way.
- Model and permission mode: the same as the dry run that kept the tool on its own.

## What must be in frame (TREATMENT S24)

- The conversation "Kiln" with the question and Pebble's answer (10 hours 10 minutes).
- Details › Activity with the Code Mode step named by what it does and the make-and-check rows complete, worded as
  2.0.0 words them (read them in the take; never type or paste them).
- The card landing: "Kept in Pebble's Toolbox · kiln_ramp_time", "Pebble kept this tested calculation on its own.
  Remove it if you don't want it.", View code and Remove.
- The pebble turning happy, if the companion is in frame.
- Out of frame or boxed for the crop: usage lines (rates, cached tokens), the model's name if it shows an account.

## Timing

Pebble's own time is never sped up or cut. The film enters the take late enough that the card lands about 1 s after
the in-point (TREATMENT §3.6, chain 11). Plan for 1–3 minutes from send to card (several model calls, two validation
runs and the blind check); the dry run measures it.

## If the dry run doesn't keep the tool on its own

Record what happened (the card that came, Activity's rows, the reason Pebble gives) and stop. Don't rephrase the
message to steer the result before the lead has seen the dry run. The fallback is HS-G: harness playback of a real
2.0.0 run's event log in which the tool was kept on its own.
