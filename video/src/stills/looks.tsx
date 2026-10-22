// The film's five key looks (gate G1.5, critic H11), built only from the core components and the timeline: frame 0,
// the reveal lockup, a punch-in (AgentGuard's held run), the AgentGuard payoff (Verified) and the end card. Each look
// reads the ABSOLUTE film frame, so it renders the same in LaunchFilm, LaunchFilmSquare and the StyleFrames sampler,
// and it adapts to the aspect through useLayout(). Lane G2 animates the shots between them on this vocabulary.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, CheckMark, Cursor, Desktop, KineticText, MacWindow, PaperField, SageField, UiStill, Vignette, Wordmark, World, lockupGeometry } from "../components";
import { FILM_PEBBLE_CUES, FOCUS, PET, REVEAL_FRAME, WORLD, at, sec, shotById, time } from "../film/timeline";
import { clampPose, fitRect, poseAt, rectCenter, toWorld, type CamKey, type CamPose, type Rect } from "../motion/camera";
import { useLayout, type Layout } from "../motion/layout";
import { COLOR, EASE, LOOK, T, ramp } from "../motion/spec";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";

/* ---------- shared bits ---------- */

/** Pebble's main window with a capture inside, at its world place. */
const MainWindow: React.FC<{ children: React.ReactNode; shadow?: number }> = ({ children, shadow = 1 }) => (
  <MacWindow x={WORLD.mainWindow.x} y={WORLD.mainWindow.y} width={WORLD.mainWindow.w} height={WORLD.mainWindow.h} shadow={shadow}>
    {children}
  </MacWindow>
);

const lineOf = (shotId: string, i = 0) => shotById(shotId).captions[i]!;

/* ================================================================================================================
 * 1. Hook (frame 0): the pebble on its desktop, close; the pointer comes in; the click opens the quick chat
 * ============================================================================================================== */

export function hookCamera(L: Layout, width: number, height: number): CamKey[] {
  // frame 0 is the thumbnail: the character big enough to read in a feed (its body ≈ 15 % of the frame's width in
  // 16:9, a quarter of it in the square), on the riverbed's open ground with a stone in the near foreground
  const close: CamPose = poseAt(
    PET.centre,
    { x: width * (L.aspect === "wide" ? 0.6 : 0.58), y: height * (L.aspect === "wide" ? 0.54 : 0.52) },
    L.aspect === "wide" ? 3.8 : 3.6,
    width,
    height,
  );
  const chat = fitRect(shotById("hook").focus!, L.safe, width, height, { maxZoom: 2.0 });
  return [
    { at: 0, ...close },
    { at: at(1, 4, 9), ...chat, dur: sec(1.0) },
  ];
}

export const HookLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const click = at(1, 3);
  const keys = hookCamera(L, width, height);
  // the pointer is already on screen at frame 0 (lower left), so the thumbnail says "click me"; it reaches the pebble
  // and dwells before the click on beat 3
  const from = toWorld({ x: width * 0.3, y: height * 0.88 }, clampPose(keys[0]!, WORLD.desktop, width, height), width, height);
  return (
    <>
      <Camera keys={keys} bounds={WORLD.desktop}>
        <World>
          <Desktop />
          {frame < click + 2 ? (
            <PebbleOnFilm cues={FILM_PEBBLE_CUES} size={PET.size} x={PET.foot.x} y={PET.foot.y} />
          ) : (
            <UiStill
              name={frame < at(2, 3) ? "pet-live-01-greeting" : "pet-live-02-thinking"}
              x={WORLD.petExpanded.x}
              y={WORLD.petExpanded.y}
            />
          )}
        </World>
        <Cursor
          keys={[
            { at: 0, x: from.x, y: from.y },
            { at: click - sec(T.preClickDwell), x: PET.centre.x - 14, y: PET.centre.y + 10, travel: sec(0.75), seed: "hook" },
            { at: click + sec(0.9), x: PET.centre.x - 120, y: PET.centre.y + 110, travel: sec(0.6) },
          ]}
          clicks={[click]}
          visible={[[-sec(1), click + sec(1.4)]]}
        />
      </Camera>
      <Vignette amount={0.07} />
    </>
  );
};

/* ================================================================================================================
 * 2. Reveal (frame 504): the pebble lands as the full stop of "pebble." on the bar-8 downbeat
 * ============================================================================================================== */

export const RevealLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const g = lockupGeometry(L.type.hero, { x: width / 2, y: height * (L.aspect === "wide" ? 0.45 : 0.44) });
  const flight = 0.5;
  const takeoff = time(REVEAL_FRAME) - flight;
  const start = { x: g.box.x - g.body.w * 0.15, y: g.period.y };
  // the letters appear behind the pebble's last hop: the wipe follows it and completes as it lands
  const wipe = ramp(frame, REVEAL_FRAME - sec(flight), sec(flight), EASE.move);
  const support = lineOf("reveal");
  return (
    <PaperField pool={{ x: 0.5, y: L.aspect === "wide" ? 0.42 : 0.4 }}>
      <Wordmark
        geometry={g}
        reveal={wipe}
        pebble={{
          cues: FILM_PEBBLE_CUES,
          start,
          hops: [{ at: takeoff, to: g.period, duration: flight, height: g.body.h * 0.9 }],
        }}
      />
      <KineticText
        lines={[support.text]}
        role="support"
        at={support.in}
        exitAt={support.out}
        color={COLOR.secondary}
        align="center"
        box={{ x: L.safe.x, y: g.period.y + L.type.hero * 0.34, w: L.safe.w, h: L.type.support * 2 }}
      />
      <Vignette amount={0.05} />
    </PaperField>
  );
};

/* ================================================================================================================
 * 3. Punch-in (bar 14): AgentGuard holds the run; the panel rises from its own screen; the pointer heads to
 *    Run the tests
 * ============================================================================================================== */

export function heldCamera(L: Layout, width: number, height: number): { keys: CamKey[]; punch: CamPose } {
  const wide = L.aspect === "wide";
  const focus = wide ? FOCUS.heldPanel : FOCUS.heldPanelLeft;
  const punch = fitRect(focus, L.safe, width, height, {
    mode: "width",
    pad: wide ? Math.round(56 * L.s) : 0,
    maxZoom: L.zoom.punch,
    align: { x: wide ? 0.5 : 0, y: 0.5 },
  });
  const pane = fitRect({ x: WORLD.mainWindow.x + 300, y: WORLD.mainWindow.y + 300, w: 800, h: 400 }, L.safe, width, height, {
    maxZoom: L.zoom.pane,
  });
  return {
    punch,
    keys: [
      { at: at(13), ...pane },
      { at: at(13, 3), ...punch, dur: sec(T.camera) },
    ],
  };
}

const heldPanelLocal: Rect = { x: 342, y: 470, w: 700, h: 128 };
const runTestsLocal: Rect = { x: 386, y: 558, w: 96, h: 32 };

export const HeldLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const { keys } = heldCamera(L, width, height);
  const arrived = at(13, 3);
  const focusIn = ramp(frame, arrived - sec(0.2), sec(0.45), EASE.enter);
  const click = at(14, 3);
  const btn = rectCenter(FOCUS.runTests);
  return (
    <>
      <Camera keys={keys}>
        <World>
          <Desktop />
          <MainWindow>
            <UiStill
              name="held-unverified"
              focus={{ rect: heldPanelLocal, amount: focusIn, lift: focusIn, radius: 12, veil: 0.6, blur: 10 }}
              press={frame >= click && frame < click + sec(T.press) ? { rect: runTestsLocal, amount: 1, radius: 8 } : undefined}
            />
          </MainWindow>
        </World>
        <Cursor
          keys={[
            { at: at(13, 2), x: btn.x + 330, y: btn.y + 120 },
            { at: click - sec(T.preClickDwell), x: btn.x - 6, y: btn.y + 4, travel: sec(0.9), seed: "held" },
          ]}
          clicks={[click]}
          visible={[[at(13, 2), at(15)]]}
        />
      </Camera>
    </>
  );
};

/* ================================================================================================================
 * 4. Payoff (bar 16): "Verified · pytest 42 passed on current files" lifts off the window; a check draws on outside
 *    it (critic C3); the pebble is happy; "Done means tested"
 * ============================================================================================================== */

/** The payoff's lifted card: both receipt lines with the reply's avatar (16:9), or the Verified line alone, larger
 *  (the square, where UI text must stay ≥ 34 px for a 360 px phone). */
export const verifiedCard = (L: Layout): Rect => (L.aspect === "wide" ? FOCUS.receiptRow : FOCUS.verifiedChip);

/** The check mark's size and its gap to the card, px. The mark's left edge sits on the safe area's left edge, the
 *  caption's edge, so the caption, the mark and the card share one axis. */
const verifiedMark = (L: Layout) => ({
  size: Math.round((L.aspect === "wide" ? 80 : 72) * L.s),
  gap: Math.round((L.aspect === "wide" ? 40 : 30) * L.s),
});

export function verifiedCamera(L: Layout, width: number, height: number): CamPose {
  const wide = L.aspect === "wide";
  // room left of the card for the check mark (outside the UI's bounds, critic C3) and right of it for the pebble
  const mark = verifiedMark(L);
  const markRoom = mark.size + mark.gap;
  const pebbleRoom = Math.round((wide ? 330 : 0) * L.s);
  const stage = L.stage.withTopCaption;
  const box = {
    x: stage.x + markRoom,
    y: stage.y,
    w: stage.w - markRoom - pebbleRoom,
    h: stage.h - Math.round((wide ? 60 : 250) * L.s),
  };
  return fitRect(verifiedCard(L), box, width, height, { mode: "width", maxZoom: wide ? 3.0 : 3.3, align: { x: 0, y: wide ? 0.28 : 0.36 } });
}

const toLocal = (r: Rect): Rect => ({ x: r.x - WORLD.mainWindow.x, y: r.y - WORLD.mainWindow.y, w: r.w, h: r.h });

export const VerifiedLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const wide = L.aspect === "wide";
  const pose = verifiedCamera(L, width, height);
  const cardWorld = verifiedCard(L);
  const lands = at(16);
  const lift = ramp(frame, lands, sec(0.5), EASE.enter);
  const caption = lineOf("verified");
  const toFrame = (p: { x: number; y: number }) => ({ x: width / 2 + (p.x - pose.x) * pose.zoom, y: height / 2 + (p.y - pose.y) * pose.zoom });
  const card = { ...toFrame(cardWorld), w: cardWorld.w * pose.zoom, h: cardWorld.h * pose.zoom };
  const vLine = toFrame({ x: FOCUS.verifiedLine.x, y: FOCUS.verifiedLine.y + FOCUS.verifiedLine.h / 2 });
  // the check: left of the Verified line, outside the card
  const mark = verifiedMark(L);
  const markSize = mark.size;
  const markAt = { x: card.x - mark.gap - markSize / 2, y: vLine.y };
  // the pebble: beside the card (16:9) or below its right end (square), looking at the Verified line
  const pebbleSize = Math.round((wide ? 260 : 250) * L.s);
  const pebbleFoot = wide
    ? { x: card.x + card.w + Math.round(150 * L.s), y: card.y + card.h + Math.round(18 * L.s) }
    : { x: card.x + card.w - Math.round(90 * L.s), y: card.y + card.h + Math.round(220 * L.s) };
  return (
    <>
      <Camera pose={pose}>
        <World>
          <Desktop />
          <MainWindow>
            <UiStill
              name="main-done"
              focus={{ rect: toLocal(cardWorld), amount: Math.max(lift, 0.0001), lift, radius: wide ? 12 : 8, veil: 0.66, blur: 11 }}
            />
          </MainWindow>
        </World>
        <CheckMark at={markAt} space="frame" size={markSize} drawAt={lands + sec(0.25)} avoid={cardWorld} />
        <PebbleOnFilm cues={FILM_PEBBLE_CUES} size={pebbleSize} x={pebbleFoot.x} y={pebbleFoot.y} />
        <KineticText lines={[caption.text]} role="headline" at={caption.in} exitAt={caption.out} box={L.caption.top} valign="center" />
      </Camera>
    </>
  );
};

/* ================================================================================================================
 * 5. End card (bars 29–32): the lockup, the claim, the CTA and the URL, held under the final chord
 * ============================================================================================================== */

export const EndCardLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const wide = L.aspect === "wide";
  const shot = shotById("endcard");
  const [claim, cta, url, small] = shot.captions as [typeof shot.captions[0], typeof shot.captions[0], typeof shot.captions[0], typeof shot.captions[0]];
  const heroSize = Math.round(L.type.hero * (wide ? 0.6 : 0.62));
  const g = lockupGeometry(heroSize, { x: width / 2, y: height * (wide ? 0.285 : 0.27) });
  const lands = shot.from;
  const flight = 0.55;
  const claimTop = g.period.y + Math.round((wide ? 92 : 84) * L.s);
  const ctaTop = claimTop + Math.round(L.type.headline * 1.06) + Math.round((wide ? 46 : 40) * L.s);
  return (
    <PaperField pool={{ x: 0.5, y: wide ? 0.4 : 0.38 }}>
      <Wordmark
        geometry={g}
        reveal={ramp(frame, lands - sec(0.1), sec(0.45), EASE.enter)}
        pebble={{
          cues: FILM_PEBBLE_CUES,
          start: { x: g.period.x + Math.round(260 * L.s), y: g.period.y },
          hops: [{ at: time(lands) - flight, to: g.period, duration: flight }],
        }}
      />
      <KineticText lines={[claim.text]} role="headline" at={claim.in} align="center" box={{ x: L.safe.x, y: claimTop, w: L.safe.w, h: L.type.headline * 1.2 }} />
      <KineticText lines={[cta.text]} role="cta" at={cta.in} enter="fade" align="center" color={COLOR.ink} box={{ x: L.safe.x, y: ctaTop, w: L.safe.w, h: L.type.cta * 1.3 }} />
      <KineticText
        lines={[url.text]}
        role="mono"
        at={url.in}
        enter="fade"
        align="center"
        color={COLOR.accent}
        box={{ x: L.safe.x, y: ctaTop + Math.round(L.type.cta * 1.3) + Math.round(14 * L.s), w: L.safe.w, h: L.type.mono * 1.4 }}
      />
      <KineticText
        lines={[small.text]}
        role="small"
        at={small.in}
        enter="fade"
        align="center"
        color={COLOR.secondary}
        box={{ x: L.safe.x, y: height - L.safe.y - Math.round(L.type.small * 1.4), w: L.safe.w, h: Math.round(L.type.small * 1.4) }}
      />
      <Vignette amount={0.05} />
    </PaperField>
  );
};


/* ================================================================================================================
 * The sage field (tension questions, the claims): one white Fraunces line per bar, landing word by word, held still
 * ============================================================================================================== */

export const SageLinesLook: React.FC<{ shotId: "questions" | "claims" }> = ({ shotId }) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const shot = shotById(shotId);
  const current = shot.captions.find((c) => frame >= c.in && frame < c.out + sec(0.25));
  return (
    <SageField>
      {current ? (
        <KineticText
          key={current.text}
          lines={[current.text]}
          role="headline"
          at={current.in}
          exitAt={current.out}
          color={LOOK.onSage}
          align="center"
          valign="center"
          box={L.safe}
        />
      ) : null}
      <Vignette amount={0.08} />
    </SageField>
  );
};
