# The launch film's verification loop (the owner's instruction, 1 Nov 2026)

"After the film is ready, put yourself in a verification loop: spawn a subagent to verify and critique the launch
video, understand any fault of your work and make it better, until that critique finds it launch-ready and tasteful,
so a real audience can also enjoy watching it."

## The loop

1. **Render** the current film (intermediate rounds: the half-scale 30 fps drafts, `master/draft.sh 16x9` and
   `4x5`; the last round: the full-resolution masters, `master/final.sh`), then `master/qa.sh` on each.
2. **A fresh critic each round** (a new subagent, never one that built or fixed anything): the brief is
   `.work/launch/briefs/critic.md` plus the round's specifics. It reads only the render, its QA folder,
   `docs/launch/TREATMENT.md` and the `launch-film-craft` skill, never the scene code or the builders' handoffs. It
   judges as a real audience: a muted LinkedIn viewer on a phone (the 4:5) and a desktop viewer (the 16:9).
3. **Round N > 1 starts by verifying** every issue in `REVIEW-(N−1).md` as FIXED, PARTLY or STILL, then looks for
   regressions, then for anything new.
4. **Output:** `.work/launch/critic/REVIEW-N.md`: a verdict (rework / fix then ship / ship) and the issues ranked MUST,
   SHOULD and NICE, with timestamps and concrete fixes.
5. **The director fixes** every MUST and the SHOULDs that improve the film, logs what changed and what was declined
   (with the reason) in `.work/launch/critic/FIXES-N.md`, re-renders, and goes to step 2.
6. **Exit:** a critic's verdict is "ship" with no MUST left, and it calls the film launch-ready and tasteful. Then the
   full-resolution masters (16:9 and 4:5) get one last verification round before delivery. If a round finds nothing
   new but the director disagrees with a MUST, the owner decides.

## The result (2 Nov 2026)

The loop exited after round 5, the last round, on the full-resolution masters (`.work/launch/critic/REVIEW-5.md` and
`FIXES-5.md`). Its critic said "ship" for both cuts.

- **The 4:5**, at 22:01, after one MUST.
  - MUST-1: in the Stealth recording, a desktop mask ran onto Pebble's window's edge, and three lines inside the
    window were frosted. The description says Pebble's own windows are never altered.
  - It was fixed in the film, not the sentence: nothing inside the window is masked (0f1b7fe).
  - The critic's words: "launch-ready and tasteful for a muted phone viewer".
- **The 16:9**, at about 22:45, with no MUST and no SHOULD.
  - NICE N-8 applied: its delivery's rate cap is 30 Mbit/s at Level 4.1 (e0ff991).
- **Left for the owner:** one listen on headphones before posting, at 0:08, 0:17, 0:18 and 1:21. No round judged the
  sound by ear.
