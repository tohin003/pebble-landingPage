// Copy strings mark inline code with backticks ("`~/.pebble` holds …", copy.ts header). This renders them: the spans
// between backticks become <code translate="no">, the rest stays text.
import { Fragment, type ReactNode } from "react";

export function inline(text: string): ReactNode {
  if (!text.includes("`")) return text;
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} translate="no">
        {part}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
