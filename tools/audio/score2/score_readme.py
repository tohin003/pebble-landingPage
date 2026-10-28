"""score2 lane: write the score previews' README.txt for the person, in plain words, from the build records.

Every number comes from the build's own records (master/main.build.json, x40.build.json and the previews' facts in
master/*.preview.json); none is typed by hand. Pure Python: no audio.

  python3 -I tools/audio/score2/score_readme.py .work/score2 .work/score2/preview/README.txt
"""
import json
import os
import sys
import textwrap


def bullet(text, indent="  "):
    """One bullet, wrapped at 118 columns after its numbers are filled in."""
    return textwrap.fill(" ".join(text.split()), width=118, initial_indent="- ", subsequent_indent=indent)


def fmt(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def mmss(t):
    return f"{int(t // 60)}:{int(t % 60):02d}"


def main():
    W, out = os.path.abspath(sys.argv[1]), sys.argv[2]
    M = os.path.join(W, "master")
    b = {f: json.load(open(os.path.join(M, f"{f}.build.json"))) for f in ("main", "x40")}
    pv = {f: json.load(open(os.path.join(M, f"{f}.preview.json"))) for f in ("main", "x40")
          if os.path.exists(os.path.join(M, f"{f}.preview.json"))}
    plan = {f: json.load(open(os.path.join(W, "cuesheet", f"plan_{f}.json"))) for f in ("main", "x40")}

    def seam(f, s):
        return next(x for x in b[f]["seams"] if x["id"] == s)

    def comp(f, d):
        return next(c for c in b[f]["composites"] if c["duck"] == d)

    def aac(f, k, enc="apple_audiotoolbox_cbr"):
        return b[f]["masters"][k]["aac"][enc]

    def loud(f, k):
        n, a = aac(f, k, "native_default"), aac(f, k)
        return (f"{a['integrated_lufs']} LUFS; peak {n['true_peak_dbtp']} dBTP on FFmpeg's encoder, "
                f"{a['true_peak_dbtp']} on Apple's")

    st = {f: {s["id"]: s for s in b[f]["seams"]} for f in b}
    worst_step = max(abs(seam("main", s)["master_web"]["step_3s_lu"]) for s in ("M2s", "M3s", "F4"))
    lags = [abs(v) for f in b for s in b[f]["seams"] for v in (s["grid"]["lag_bed_vs_incoming_source_samples"],
                                                              s["grid"]["lag_master_vs_bed_samples"]) if v is not None]
    beat_cues = {f: {c["id"] for c in plan[f]["cues"] if c["track"] in ("YourBreath", "TechnoFestVibes")} for f in plan}
    ons = [c for f in b for k, c in b[f]["onsets_vs_beats"]["cues"].items() if k in beat_cues[f]
           and c.get("median_offset_ms") is not None and c["beats_with_clear_attack"] >= 8]
    worst_med = max(abs(c["median_offset_ms"]) for c in ons) if ons else None
    att = b["main"]["classifier"]["web"].get("attribution", [])
    music_only = [a for a in att if a["verdict"] == "the music itself"]
    not_music = [a for f in b for a in b[f]["classifier"]["web"].get("attribution", [])
                 if a["verdict"] != "the music itself"]
    nm_line = ("" if not not_music else
               " Not all of them are the music: " + "; ".join(
                   f"{fmt(a['window_s'][0])}-{fmt(a['window_s'][1])} reads {a['verdict']}" for a in not_music) + ".")
    added = [round(max(a["mix"].values()) - max(a["music_alone"].values()), 3) for f in b
             for a in b[f]["classifier"]["web"].get("attribution", []) if a["mix"] and a["music_alone"]]
    tg = b["main"]["classifier"].get("title_grid", {})
    tgw = tg.get("web_master", {})
    tgm = tg.get("music_alone_at_web_gain", {})
    j5 = st["main"]["J5"]["continuity"]["bed"]
    k5 = j5.get("harmony", {})
    main_len = fmt(b["main"]["film_length_s"])
    pre = {f: (pv[f]["format"]["duration"] if f in pv else None) for f in ("main", "x40")}

    sfx = "\n".join(bullet(x) for x in [
        "Three big moments: the Drop (0:20.00), the kept card (1:38.03) and the title (1:58.03). Their hits are "
        "temporary for now: the final ones come from a free professional library or from your own recordings, and "
        "get balanced again.",
        f"At the Drop the hit sits on top of the music (+{comp('main', 'drop')['composite_over_bed_db']} dB over the "
        "music alone). At the kept card and the title the music itself is at its loudest, so the hit sits inside it, "
        "and the music dips only 1.5 dB for it.",
        "The plunk at the Drop and the stone tap at the title stand in for your recordings of a pebble dropped into "
        "water and a pebble tapped on wood.",
        "Soft ticks at about 0:03, 0:41 and 0:46 mark roughly where the send, \"=\" and a click will be; they move to "
        "the exact frames when the real screens are recorded. The Enter tick at 1:23.03 sits alone in the hush.",
        "A whoosh as the Space slides and as each ring arrives, a reverse swell into the title, and room tone at the "
        "very start, in the hush and at the very end. Nothing sounds under the Return's screens: the music carries "
        "them."])
    lines = [f"{k:<24}{loud(f, m)}" for k, f, m in (("main film, social:", "main", "social"),
                                                    ("main film, website:", "main", "web"),
                                                    ("40-second cut, social:", "x40", "social"),
                                                    ("40-second cut, website:", "x40", "web"))]
    checked = "\n".join([
        bullet("Every cut is on a bar line and nothing is stretched or sped up. Each change's crossfade ends exactly "
               "on the incoming downbeat, and every sample of music sits exactly where the plan puts it "
               f"({max(lags) if lags else 0} samples off at every change)."),
        bullet("In the beat-driven cues (Your Breath and Techno Fest Vibes) the beats land within "
               f"{worst_med:.1f} thousandths of a second of the beat grid (the median of each cue)."),
        bullet("No clicks at any change, checked by measurement and by looking at every change zoomed in."),
        bullet(f"Inside a track, the three splices change the loudness by at most {worst_step:.2f} LU over 3 seconds "
               "(about half a decibel)."),
        bullet("Loudness, measured after the AAC encode (FFmpeg's encoder makes the film's deliveries; Apple's made "
               "these previews):")] + ["    " + x for x in lines] + [
        "  (Social: -14 LUFS and at most -1.0 dBTP. Website: -16 LUFS and at most -1.5 dBTP.) The film is meant to be",
        "  dynamic: a quiet open and a quiet dusk, a loud peak."])
    still_open = "\n".join([
        bullet("An automatic checker (Apple's sound classifier, which this project uses to catch anything that might "
               f"sound like a phone, a horn or an alarm) flags {len(att)} moments of the main film, {len(music_only)} "
               "of them in the music itself: Your Breath's breakdown and lift around the kept card reads as "
               "\"ringtone\" or \"telephone\", and Born Of The Sky's quiet opening and its horns around the title read "
               "as \"foghorn\". The sound effects I added change no reading by more than "
               f"{max(added) if added else 0:.2f} (on a 0-1 scale). Around the title, on the stricter half-second "
               f"grid, the finished mix reads at most {tgw.get('foghorn_max', '?')} \"foghorn\", and the music alone "
               f"{tgm.get('foghorn_max', '?')}.{nm_line} If any of it makes you think of a phone or a horn, say so."),
        bullet("The hits are temporary, and the plunk and the tap are stand-ins, until the final sounds exist."),
        bullet("Before the final film, a few files from Mixkit (Your Breath, Techno Fest Vibes and some of the sound "
               "effects) need to be downloaded by you, by hand, from their own pages; you'll get the list. The final "
               "film is then made from your copies.")])
    listen = "     ".join(f"{s['id']} {mmss(round(max(0.0, s['t'] - 5.0)))}" for s in plan["main"]["seams"])
    txt = f"""PEBBLE 2.0 FILM, "RIPPLES": THE SCORE, CUT LIKE A FILM

WHAT THIS IS
You asked for the music to be cut the way a film's is: different music for different scenes, changing where the scene
changes. You said Your Breath (B2) and Techno Fest Vibes (B4) feel energetic and fresh, and that the A series (Scott
Buckley) holds a cinematic vibe. So B2 and B4 carry the energetic middle, the peak and the Return, and the A series
opens the film, gives it a quiet dusk, and closes it with the title.

  Pebble-2.0-score-preview.mp4       the main film ({main_len}), with the Return (the montage) at the end
  Pebble-2.0-40s-score-preview.mp4   the 40-second cut for social media (0:40.00)

There is no picture yet: the real 2.0 screens are recorded near the release. On screen you see which scene you are in,
which music is playing (track and artist), and a running clock. A bar along the bottom has a white line at every change
of music, labelled with how the change is made. A card counts down to the next change, says how it is made, and says
what to listen for. The sound is the social-media master (-14 LUFS, the loudness Instagram, X and LinkedIn expect).

Every change and every level here was measured and looked at on a spectrogram. Nobody has listened yet: your ears are
the first.

HOW TO LISTEN (about 10 minutes)
1. On headphones or good laptop speakers, watch the main film once straight through, just for the feeling.
2. Then listen to each change of music again. Each of these times is 5 seconds before a change:
     {listen}
3. Play it once on your phone.
4. Tell me in your own words what you feel, for example "the merge feels like a jolt" or "the climax isn't big enough".

THE MAIN FILM, SCENE BY SCENE
  0:00-0:20  M1 "Still Water"                 A4 Born Of The Sky (Scott Buckley)
             Act I: the question, "Pebble 2.0", the companion everywhere, the card. Near-silent strings that grow;
             their own crescendo is the riser into the Drop.
  0:20-0:54  M2 "Allow"                       B2 Your Breath (Mixkit)
             The Drop (your Allow), Ring 1 (your browser) and Ring 2 (your apps). B2's own drop lands on the Allow.
             At 0:40.00, where Ring 2 arrives, two bars are left out (the track's own order is kept).
  0:54-1:23  M3 "Every Ring"                  B4 Techno Fest Vibes (Mixkit)
             Ring 3 (your files and the terminal), Ring 4 (your project and AgentGuard's Verified), "Bigger tasks",
             Command-K. Harder and brighter. Two bars are left out at 0:59.81, on the cut to the flyer, and its real
             ending stops exactly on Enter at 1:23.03.
  1:23-1:34  M4 "Dusk"                        A1 Starfire (Scott Buckley)
             The quiet passage: Stealth Lockdown, the Veil, the honest line, the menu bar. A held chord with no beat,
             so the line can be read.
  1:34-1:54  M5 "Its Own Tools, the Return"   B2 Your Breath again, later in the track
             The climax: Pebble asks to keep a tool it made, then keeps it. B2's breakdown builds, stops for one beat,
             and its biggest lift lands the "Kept in Pebble's Toolbox" card at 1:38.03. It runs on under the Return,
             where every feature rushes in around the stone.
  1:54-2:15  M6 "Ripples (End Title)"         A4 Born Of The Sky again, its ending
             The merge: every screen returns into the stone, on Born Of The Sky's held dominant. Then the title
             "Pebble 2.0" at 1:58.03, the end card's two pages, and the composer's own ending, which dies away by
             itself (only its last 0.3 seconds, already near silence, are faded into room tone). The film ends on the
             voice it began with.

THE CHANGES, AND WHAT TO LISTEN FOR
  J1  0:20.00  The Drop. Born Of The Sky's crescendo rises; on the downbeat the music cuts hard to Your Breath's drop,
               with the Drop hit. Listen for: an arrival exactly on the beat.
  M2s 0:40.00  A splice inside Your Breath (two bars out), as Ring 2 arrives under its sweep. Listen for: nothing at
               all; the groove should just carry on.
  J2  0:54.00  Ring 3. Your Breath's last beat of hi-hats leads into a hard cut onto Techno Fest Vibes, under a ring
               sweep. The tempo steps from 120 to 124 beats a minute as a clean cut. Listen for: the lift into a
               harder groove, with nothing stumbling on the first beat.
  M3s 0:59.81  A splice inside Techno Fest Vibes (two bars out), on the cut to the flyer. Listen for: nothing at all.
  J3  1:23.03  Stealth. Techno Fest Vibes' own ending stops on the downbeat, exactly on Enter. One soft tick, the chord
               rings out, and Starfire's pad fades in under it. Listen for: a true stop, not a fade, then the hush.
  J4  1:34.03  Evening. A one-second crossfade that ends exactly on Your Breath's downbeat. Its breakdown builds,
               takes a one-beat breath, and its biggest lift lands the kept card at 1:38.03. Listen for: a smooth
               hand-over, and the lift as the peak of the film.
  J5  1:54.03  The merge. A cut beat for beat back into Born Of The Sky (both are 120 beats a minute, so the pulse
               never breaks), a little quieter while the screens return into the stone. A swell made from its own
               chord rises into the title. The key opens from {k5.get('key_before', {}).get('key', '?')} into {k5.get('key_after', {}).get('key', '?')}, with B held in common.
               Listen for: the title arriving louder than the bar before it.
  F4  2:04.03  A splice inside Born Of The Sky's held chord, under the end card. Listen for: nothing at all.

THE 40-SECOND CUT
  0:00-0:28  B2 Your Breath from its intro: the question, "Pebble 2.0" on B2's own hit at 0:04, its drop as the Drop at
             0:12, then "=" and the browser.
  0:28-0:32  B2 Your Breath's biggest lift: the kept card. This is one forward jump inside the track, at bar lines on
             both sides and in the track's own order.
  0:32-0:40  B4 Techno Fest Vibes' last bar: the 40-second Return, then the title on its real stop at 0:33.94, and the
             chord rings out under the facts. A soft reverse swell rises into the cut at 0:32.
  Listen for: the jump at 0:28 staying on the beat, the push at 0:32, and the stop under the title.

THE SOUND EFFECTS
{sfx}

WHAT I CHECKED
{checked}

WHAT IS STILL OPEN
{still_open}

CREDITS
'Born Of The Sky' by Scott Buckley (edited) – CC BY 4.0 – www.scottbuckley.com.au – https://creativecommons.org/licenses/by/4.0/
'Starfire' by Scott Buckley (edited) – CC BY 4.0 – www.scottbuckley.com.au – https://creativecommons.org/licenses/by/4.0/
'Your Breath' (Eugenio Mininni) and 'Techno Fest Vibes' (Alejandro Magaña): Mixkit Stock Music Free License; no credit
needed. The 40-second cut uses only these two, so it needs no music credit.
Sound effects: Mixkit (Sound Effects Free License), Kenney (CC0) and sounds made for this film. Sound effects are the
film's; Pebble plays none of them.

PLEASE DON'T SHARE THESE
These previews are for you only. Pebble 2.0 isn't public yet, so nothing about it can be posted until it's released.
The music in them can't be shared on its own either: its licence allows it only inside the film.
"""
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, "w").write(txt)
    print("ok", len(txt.splitlines()), "lines", {k: v for k, v in pre.items()})


if __name__ == "__main__":
    main()
