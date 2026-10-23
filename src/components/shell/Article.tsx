// A plain text page (/film, /credits, /privacy, the 404) on the page's grid: everything starts on column 4, as on the
// home page, in a reading column seven columns wide (about 730 px at 1440); one column below 1024 px.
import type { ReactNode } from "react";
import styles from "./Article.module.css";

export function Article({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <article className={`wrap grid-12 ${styles.article}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={`lead ${styles.lead}`}>{lead}</p> : null}
      </header>
      {children}
    </article>
  );
}

export const articleStyles = styles;
