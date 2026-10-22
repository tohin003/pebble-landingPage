// "Watch this in the film" with the chapter's start time, next to a section (MASTER_PLAN D11). It opens the film at
// that chapter. It renders nothing for a chapter without a start time (src/content/chapters.ts: lane E sets them),
// and stays hidden until a FilmPlayer with a rendered film is on the page (html[data-film="ready"]), so it is never a
// dead button. The time is its own element, not a middle-dot string (DESIGN §3).
//
// A server component: the chapter list stays on the server, and only the small button below reaches the browser.
import { chapters, formatTimecode } from "@/content/chapters";
import { chapterChip } from "@/content/copy";
import { ChapterChipButton } from "./ChapterChipButton";

/** copy.ts `chapterChip.label(time)` is "Watch this in the film · m:ss"; the chip shows the words and the time apart. */
const CHIP_TEXT = chapterChip.label("").replace(/\s*·\s*$/, "");

export function ChapterChip({ chapterId, className }: { chapterId: string; className?: string }) {
  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter || typeof chapter.startSeconds !== "number") return null;
  return (
    <ChapterChipButton
      id={chapter.id}
      title={chapter.title}
      seconds={chapter.startSeconds}
      time={formatTimecode(chapter.startSeconds)}
      text={CHIP_TEXT}
      className={className}
    />
  );
}
