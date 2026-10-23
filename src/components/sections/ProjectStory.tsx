// Section 5, "Works in your project" (DESIGN §5 row 5, comp 3): the rail of four steps with the guide pebble on the
// pebble's path, and a stage that shows one step at a time (ProjectStory.client.tsx). Step copy is mode-qualified
// (OVERRIDES §8 C2).
//
// Each step is a split: the step's words on the left, its picture on the right.
// - 01 Edits: the ApprovalCardDemo explainer on the right; the real card in motion (loop L3) under the words, once
//   it exists.
// - 02 Tests: loop L4 on the riverbed, or until it exists the real Activity steps of a verified task.
// - 03 Commands and Git: the first sentence of a command card that can change files, word for word.
// - 04 AgentGuard: the one-line results a checked reply carries, and a link to section 3, where AgentGuard has room.
// Real captures sit on the riverbed or in a window; the explainers and quotes sit on a plain sage stage, so the two are
// never confused. Without JavaScript every step shows, one after another (the <noscript> rule below).
import type { ReactNode } from "react";
import { agentGuard, common, media, project } from "@/content/copy";
import { ApprovalCardDemo } from "@/components/explainers/ApprovalCardDemo";
import { ChapterChip } from "@/components/media/ChapterChip";
import { LoopVideo } from "@/components/media/LoopVideo";
import { MediaFrame } from "@/components/media/MediaFrame";
import { UiCrop } from "@/components/media/UiCrop";
import { PebbleStatic } from "@/components/pebble/PebbleStatic";
import { loopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import { Story, type GuidePose, type StoryStep } from "./ProjectStory.client";
import styles from "./ProjectStory.module.css";

/** The crop, in the 1200 × 750 still's units; 16:10 like the loop it stands in for. */
const STEPS = { x: 870, y: 150, w: 330, h: 206.25 } as const; // main-done: Details › Activity, the run's steps

const NO_SCRIPT = "[data-story-panel]{display:grid!important;margin-top:72px}";

function StepText({ index, chapter, children }: { index: number; chapter: string; children?: ReactNode }) {
  const step = project.steps[index]!;
  return (
    <div className={styles.words}>
      <h3 className={styles.stepTitle}>{step.title}</h3>
      <p className={styles.body}>{step.body}</p>
      <p className={styles.limit}>{step.limit}</p>
      {children}
      <ChapterChip chapterId={chapter} className={styles.chip} />
    </div>
  );
}

export function ProjectStory() {
  const l3 = loopMedia("approve-undo");
  const l4 = loopMedia("isolated-tests");
  // Phones (critic H2): a loop without a 4:5 phone cut would show only its unreadable poster, so phones skip L3 (the
  // example card beside it shows the same thing) and keep step 02's legible still instead of L4.
  const l3OnPhones = l3.phoneSources.length > 0;
  const l4Still = !l4.available || l4.phoneSources.length === 0;

  const guides: Record<GuidePose, ReactNode> = {
    editing: <PebbleStatic pose="editing" className={styles.guidePebble} />,
    testing: <PebbleStatic pose="testing" className={styles.guidePebble} />,
    idle: <PebbleStatic pose="idle" className={styles.guidePebble} />,
    happy: <PebbleStatic pose="happy" className={styles.guidePebble} />,
  };

  const panels = [
    // 01 Edits
    <>
      <StepText index={0} chapter={project.chapterIds.steps01to03}>
        {/* the real card in motion, once loop L3 exists (its still would only repeat the example beside it) */}
        {l3.available ? (
          <figure className={`${styles.thumb} ${l3OnPhones ? "" : styles.wideOnly}`}>
            <MediaFrame variant="panel" aspect="16 / 10">
              <LoopVideo
                loop={l3}
                label={media.loops.approveUndo.label}
                name={media.loops.approveUndo.name}
                sizes="(max-width: 899px) calc(100vw - 48px), 444px"
                className={styles.fill}
              />
            </MediaFrame>
            <figcaption className={styles.caption}>{common.sampleData}</figcaption>
          </figure>
        ) : null}
      </StepText>
      <div className={styles.sage}>
        <ApprovalCardDemo className={styles.demo} />
      </div>
    </>,

    // 02 Tests
    <>
      <StepText index={1} chapter={project.chapterIds.steps01to03} />
      <figure className={styles.shot}>
        <MediaFrame variant="riverbed" aspect="16 / 10" sizes="(max-width: 899px) calc(100vw - 48px), 620px">
          {l4.available ? (
            <LoopVideo
              loop={l4}
              label={media.loops.isolatedTests.label}
              name={media.loops.isolatedTests.name}
              sizes="(max-width: 899px) calc(100vw - 48px), 620px"
              className={`${styles.fill} ${l4Still ? styles.wideOnly : ""}`}
            />
          ) : null}
          {l4Still ? (
            <div className={`${styles.window} ${l4.available ? styles.phoneOnly : ""}`}>
              <UiCrop
                name="main-done"
                alt={project.media.steps}
                box={STEPS}
                display={{ wide: 436, tablet: "calc((100vw - 48px) * 0.72)", phone: "calc((100vw - 32px) * 0.92)" }}
              />
            </div>
          ) : null}
        </MediaFrame>
        <figcaption className={styles.caption}>{common.sampleData}</figcaption>
      </figure>
    </>,

    // 03 Commands and Git
    <>
      <StepText index={2} chapter={project.chapterIds.steps01to03} />
      <figure className={`${styles.sage} ${styles.quote}`}>
        <figcaption className={styles.quoteIntro}>{project.commandCard.intro}</figcaption>
        <blockquote className={styles.quoteText}>
          <p>{project.commandCard.text}</p>
        </blockquote>
      </figure>
    </>,

    // 04 AgentGuard
    <>
      <StepText index={3} chapter={project.chapterIds.step04}>
        <p className={styles.more}>
          <a href={`#${SECTIONS.agentGuard}`}>{project.verdict.link}</a>
        </p>
      </StepText>
      <figure className={`${styles.sage} ${styles.verdicts}`}>
        <figcaption className={styles.quoteIntro}>{project.verdict.intro}</figcaption>
        <ul className={styles.verdictList}>
          <li data-verified="">{agentGuard.result}</li>
          {agentGuard.notVerifiedExamples.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className={styles.sample}>{common.sampleData}</p>
      </figure>
    </>,
  ];

  const steps: StoryStep[] = project.steps.map((step, index) => ({
    n: step.n,
    name: project.rail.steps[index] ?? "",
    panel: panels[index],
  }));

  return (
    <section id={SECTIONS.project} className={`section ${styles.section}`} aria-labelledby="project-title">
      <div className="section-head">
        <h2 id="project-title">{project.h2}</h2>
        <p className="lead">{project.note}</p>
      </div>
      <Story label={project.rail.label} steps={steps} guides={guides} />
      <noscript>
        <style>{NO_SCRIPT}</style>
      </noscript>
    </section>
  );
}
