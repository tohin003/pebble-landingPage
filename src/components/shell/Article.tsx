// A plain text page (/film, /credits, /privacy, the 404): a narrow column with an H1 and a lead, then the content.
import type { ReactNode } from "react";
import styles from "./Article.module.css";

export function Article({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <article className={styles.article}>
      <header className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={`lead ${styles.lead}`}>{lead}</p> : null}
      </header>
      {children}
    </article>
  );
}

export const articleStyles = styles;
