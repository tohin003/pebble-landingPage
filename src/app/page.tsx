// The home page: the sections of docs/DESIGN.md §5, in order. Each section lives in src/components/sections and
// fetches what it needs itself, so lanes F2a and F2b fill the sections without editing this file. Page-level overlays
// (the sticky call to action and the film theatre) are mounted here once.
import { formatTimecode, timedChapters } from "@/content/chapters";
import { FilmPlayer, type TimedChapter } from "@/components/media/FilmPlayer";
import { AgentGuard } from "@/components/sections/AgentGuard";
import { Benchmarks } from "@/components/sections/Benchmarks";
import { Film } from "@/components/sections/Film";
import { FinalCta } from "@/components/sections/FinalCta";
import { Hero } from "@/components/sections/Hero";
import { Infrastructure } from "@/components/sections/Infrastructure";
import { Install } from "@/components/sections/Install";
import { Limits } from "@/components/sections/Limits";
import { Memory } from "@/components/sections/Memory";
import { Models } from "@/components/sections/Models";
import { OnYourDesktop } from "@/components/sections/OnYourDesktop";
import { OpenSourceFaq } from "@/components/sections/OpenSourceFaq";
import { Pace } from "@/components/sections/Pace";
import { Privacy } from "@/components/sections/Privacy";
import { ProjectStory } from "@/components/sections/ProjectStory";
import { ViewsAndTour } from "@/components/sections/ViewsAndTour";
import { StickyCta } from "@/components/shell/StickyCta";
import { filmMedia } from "@/lib/media";
import { getRelease } from "@/lib/release";

import { stickyCta } from "@/content/copy";
// ISR: the release facts (src/lib/release.ts) refresh at most once an hour (OVERRIDES §1, critic C7).
export const revalidate = 3600;

export default async function Home() {
  const release = await getRelease();
  const chapters: TimedChapter[] = timedChapters().map((c) => ({ id: c.id, title: c.title, startSeconds: c.startSeconds ?? 0, time: formatTimecode(c.startSeconds ?? 0) }));
  return (
    <>
      <Hero />
      <Film />
      <AgentGuard />
      <OnYourDesktop />
      <ProjectStory />
      <Models />
      <Pace />
      <Memory />
      <ViewsAndTour />
      <Infrastructure />
      <Benchmarks />
      <Privacy />
      <Install />
      <Limits />
      <OpenSourceFaq />
      <FinalCta />
      <StickyCta release={release} facts={stickyCta.facts(release.version, release.sizeLabel)} />
      <FilmPlayer film={filmMedia()} chapters={chapters} />
    </>
  );
}
