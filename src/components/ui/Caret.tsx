// The disclosure caret (Phosphor's CaretDown, as the FAQ draws it): one path, currentColor, hidden from assistive tech.
export const CARET_PATH =
  "M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z";

export function Caret({ className }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d={CARET_PATH} />
    </svg>
  );
}
