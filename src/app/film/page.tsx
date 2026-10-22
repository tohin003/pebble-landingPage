// /film: the film's transcript, part by part (MASTER_PLAN §7.2 "Routes", critic H4). STUB by lane F1.
// TODO(F2, with lane E): the "What you see" descriptions and the sound lines, once chapters.ts matches the final cut.
// They are left out on purpose for now: the draft descriptions in chapters.ts still describe beats that OVERRIDES §8
// C3 removed (a test counter, "network off"), and this page must never show an untrue line.
import type { Metadata } from "next";
import Link from "next/link";
import { chapters, filmDurationLabel, formatTimecode, timedChapters } from "@/content/chapters";
import { filmPage, film as filmCopy } from "@/content/copy";
import { seo } from "@/content/seo";
import { FilmPlayer, type TimedChapter } from "@/components/media/FilmPlayer";
import { FilmTrigger } from "@/components/media/FilmTrigger";
import { Article, articleStyles as styles } from "@/components/shell/Article";
import { filmMedia } from "@/lib/media";

export const metadata: Metadata = {
  title: seo.pages.film.title,
  description: seo.pages.film.description,
  alternates: { canonical: "/film" },
};

export const revalidate = 3600;

export default function FilmPage() {
  const duration = filmDurationLabel();
  const timed: TimedChapter[] = timedChapters().map((c) => ({ id: c.id, title: c.title, startSeconds: c.startSeconds ?? 0, time: formatTimecode(c.startSeconds ?? 0) }));
  return (
    <Article title={filmPage.h1} lead={filmPage.lead}>
      <div className={styles.body}>
        <FilmTrigger label={filmCopy.play} />
        {duration ? <p className="small">{filmPage.durationLabel(duration)}</p> : null}
        <h2>{filmPage.transcriptHeading}</h2>
        {chapters.map((chapter) => (
          <section key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
            <h3 id={`chapter-${chapter.id}`}>{chapter.title}</h3>
            <p className="small">{filmPage.onScreenLabel}</p>
            <ul className={styles.list}>
              {chapter.onScreen.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="small">{filmPage.sampleData}</p>
        <p className={styles.back}>
          <Link href="/" prefetch={false}>
            {filmPage.backHome}
          </Link>
        </p>
      </div>
      <FilmPlayer film={filmMedia()} chapters={timed} />
    </Article>
  );
}
