// The first focusable element on every page: jumps past the header to <main id="main">.
import { header } from "@/content/copy";
import styles from "./SkipLink.module.css";

export function SkipLink() {
  return (
    <a className={styles.skip} href="#main">
      {header.skipLink}
    </a>
  );
}
