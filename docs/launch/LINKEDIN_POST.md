# Pebble 2.0: the LinkedIn post kit (draft for the owner)

Every claim below is the published one (the v2.0.0 and v2.0.1 release notes, README@v2.0.1). Edit the voice freely;
keep the numbers, the method sentence and Stealth Lockdown's honest line exactly as they are.

## What to upload

- **The video:** `pebble-2.0-launch-4x5-linkedin.mp4` (1080×1350, −14 LUFS). Post the 4:5 natively: on a phone it
  fills about 0.36 of the screen height against 0.20 for 16:9. Keep the 16:9 file for a Company Page, YouTube and the
  site.
- **Captions:** attach `pebble-2.0-launch.srt` (LinkedIn reads SRT on desktop uploads only; attach it before
  posting). It holds only the on-screen text, because there is no voice.
- **Cover:** frame 0 is the cover on mobile ("This is Pebble." with the pebble). On desktop, upload
  `poster-4x5.png` as the thumbnail.

## The post (≈ 1,700 characters; LinkedIn allows 3,000)

> Pebble 2.0 is out.
>
> Pebble is a small, open-source AI companion that lives on your Mac. For 2.0 we put it up against Claude Code and
> Codex: same model, same tasks.
>
> On Pebble's held-out benchmark (golden set 2.0: 85 tasks in 17 families, 3 phrasings each, 255 runs per product,
> one model for both products in each comparison), Pebble:
> • did more tasks correctly: 92.2 % against Claude Code's 83.5 % (both on claude-opus-5-5), and 95.3 % against
>   Codex's 90.6 % (both on gpt-6.1-sol)
> • said "done" when it wasn't less often: 6.3 % against 13.7 %, and 3.9 % against 7.1 %
> • cost less per task: $0.091 against $0.117, and $0.042 against $0.050
>
> What's new in 2.0:
> • It uses your Mac: the app windows and websites you allow.
> • AgentGuard: "done" means checked. Tests the host ran, files you asked to keep, output matched to its file
>   byte for byte.
> • Pebble's Workshop: it makes small tools, tests them in a sandbox, and keeps one on its own only after a blind
>   check. When the check disagrees, it asks you.
> • Memory in six layers, all visible, any one forgettable.
> • Context warping: long tasks keep a smaller window. Older results are sealed, and any one comes back exactly.
> • Pebble Remote for iPhone: approve with Face ID. Source only: you build it with Xcode.
> • Stealth Lockdown for presenting. Hidden from screen capture and screen sharing, not from a camera, a capture card
>   or a process list. Exams and interviews that forbid assistants still forbid it.
>
> Free and open source (Apache-2.0), for Macs with Apple silicon:
> github.com/tohin003/Pebble
>
> Full results, including time, safety and where Pebble trails, are in the 2.0.0 release notes. Costs are at
> public list prices. The film is shown with sample data and edited for time.
> Music: "Your Breath" by Eugenio Mininni (Mixkit).
>
> #opensource #AI #macOS #developertools

## The video's description (YouTube, the site, or a first comment)

> Pebble 2.0, the launch film. Shown with sample data. Edited for time. Pebble's interface is real: recordings of
> Pebble 2.0 on a Mac, Pebble 2.0.1's own interface running with sample data, and the Pebble Remote app (open source)
> in the iOS Simulator against a stand-in Mac. Benchmark: golden set 2.0's held-out split, 255 runs per product, one
> model for both products in each comparison; full results in the 2.0.0 release notes. Pebble isn't affiliated with
> Anthropic or OpenAI; Claude Code and Codex are their products. Music: "Your Breath" by Eugenio Mininni (Mixkit).
> Pebble's character engine: bloub by Jérémy Perret (MIT).

## Notes for the owner

- **Thumbnail:** on desktop, upload a custom thumbnail. The critic suggests the frame with the rivals' names and "Same
  model. Same tasks." over the tiny pebble; it sells the story better than frame 0.

- "we" can become "I" if you post it as a solo maker.
- Where Pebble trailed (by one task each: remembering across sessions against Claude Code, long tasks against Codex)
  and the safety result are in the release notes the post links to. Mention them in a comment if someone asks: the
  post stays honest that way.
- Never call the overall result "beats": the plan allows that word only per family, where the 95 % lower bound is
  above zero.
- Don't submit the film or its audio to any Content ID or fingerprinting service (Mixkit's terms).
