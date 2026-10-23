// Section 5, "Works in your project" (DESIGN-LEXINGTON §6 Works in your project, comp lex-A): the head on the rail
// ("In your project / How a coding task goes"), then, across columns 4–12, the story's rail: four stones on the
// pebble's ground (a local Horizon) with the guide pebble standing on the current one, and under a hairline a stage
// that shows one step at a time as a 4 | 5 split (ProjectStory.client.tsx). Step copy is mode-qualified (OVERRIDES §8
// C2), and each step's limit follows it at the same size.
//
// Each step: its words in columns 4–7, its picture in 8–12.
// - 01 Edits: the ApprovalCardDemo explainer on the flat panel (a recreation, labelled "Interactive example"); the
//   guide pebble reads its state.
// - 02 Tests: a real capture on the riverbed tile, one card at about the app's own scale: loop L4 (square, and its 4:5
//   cut on phones) once rendered, until then the real Activity steps of a verified task.
// - 03 Commands and Git: the first sentence of a command card that can change files, word for word, on the panel.
// - 04 AgentGuard: the one-line results a checked reply carries, on the panel, and a link to section 3.
// Real captures sit on the riverbed, the explainer and the quotes on the flat panel, so the two are never confused.
// Without JavaScript every step shows, one after another (the <noscript> rule below).
import type { ReactNode } from "react";
import { agentGuard, common, media, project } from "@/content/copy";
import { labels } from "@/content/labels";
import { ApprovalCardDemo } from "@/components/explainers/ApprovalCardDemo";
import { ChapterChip } from "@/components/media/ChapterChip";
import { LoopVideo } from "@/components/media/LoopVideo";
import { MediaFrame } from "@/components/media/MediaFrame";
import { UiCrop } from "@/components/media/UiCrop";
import { PebbleStatic } from "@/components/pebble/PebbleStatic";
import { SectionHead } from "@/components/ui/SectionHead";
import { TextLink } from "@/components/ui/TextLink";
import { loopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import { Story, type GuidePose, type StoryStep } from "./ProjectStory.client";
import styles from "./ProjectStory.module.css";

/** main-done's Details › Activity: the run's steps, from the two approved edits to "Verified · pytest 42 passed …". */
const STEPS = { x: 870, y: 150, w: 330, h: 206.25 } as const;
/** The tile: columns 8–12 (515 px at 1440, square), at most 515 px when the stage stacks; 4:5 on phones. */
const TILE_SIZES = "(max-width: 560px) calc(100vw - 32px), 515px";

const NO_SCRIPT = "[data-story-panel]{display:grid!important;margin-top:56px}";

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
  const l4 = loopMedia("isolated-tests");
  // Phones (critic H2): without a 4:5 cut of its own, a loop would show only its poster, so phones keep the legible
  // still instead of L4; with L4 and its cut, the still goes.
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
      <StepText index={0} chapter={project.chapterIds.steps01to03} />
      <div className={`${styles.picture} ${styles.flat}`}>
        <ApprovalCardDemo className={styles.demo} />
      </div>
    </>,

    // 02 Tests
    <>
      <StepText index={1} chapter={project.chapterIds.steps01to03} />
      <figure className={`${styles.picture} ${styles.tileFigure}`}>
        <MediaFrame variant="riverbed" aspect="var(--tile-aspect)" sizes={TILE_SIZES}>
          {l4.available ? (
            <LoopVideo
              loop={l4}
              label={media.loops.isolatedTests.label}
              name={media.loops.isolatedTests.name}
              sizes={TILE_SIZES}
              className={`${styles.fill} ${l4Still ? styles.wideOnly : ""}`}
            />
          ) : null}
          {l4Still ? (
            <div className={`${styles.card} ${l4.available ? styles.phoneOnly : ""}`}>
              <UiCrop
                name="main-done"
                alt={project.media.steps}
                box={STEPS}
                display={{ wide: 396, tablet: "396px", phone: "calc((100vw - 32px) * 0.92)" }}
                className={styles.cardCrop}
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
      <figure className={`${styles.picture} ${styles.flat}`}>
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
          <TextLink href={`#${SECTIONS.agentGuard}`}>{project.verdict.link}</TextLink>
        </p>
      </StepText>
      <figure className={`${styles.picture} ${styles.flat}`}>
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
    <section id={SECTIONS.project} className="sec" aria-labelledby="project-title">
      <SectionHead id="project-title" label={labels.project} title={project.h2} lead={project.note} />
      <div className="wrap grid-12 sec-body">
        <div className="main">
          <Story label={project.rail.label} steps={steps} guides={guides} />
        </div>
      </div>
      <noscript>
        <style>{NO_SCRIPT}</style>
      </noscript>
    </section>
  );
}
