// "pebble" in Inter 650 with the galet as its full stop, like the app's own wordmark (comp 3).
import { header } from "@/content/copy";
import { Galet } from "./Galet";
import styles from "./Wordmark.module.css";

export function Wordmark({ className, href = "/#top" }: { className?: string; href?: string }) {
  return (
    <a className={`${styles.wordmark} ${className ?? ""}`} href={href} aria-label={header.wordmarkLabel} translate="no">
      pebble
      <Galet className={styles.dot} />
    </a>
  );
}
