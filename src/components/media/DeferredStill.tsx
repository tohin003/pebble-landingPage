"use client";
// Holds a still back until it comes near the screen (QA lane F3). Native lazy loading fetches every image within about
// 1,250 px of the viewport as soon as the page is laid out, before its first paint, so on phones AgentGuard's three
// large crops (about 225 KB) start loading with the fonts and the framework and slow the first screen. Here the
// pictures mount only when the still is within `margin` of the viewport, which is after the first paint even when it
// is already that close. Until then the box keeps its size (the caller sizes it), and it carries the image's name
// (role="img"), so a screen reader hears the same thing. Without JavaScript the pictures load from the <noscript>.
import { useEffect, useRef, useState, type ReactNode } from "react";

export function DeferredStill({
  alt,
  className,
  margin = "900px 0px",
  children,
}: {
  alt: string;
  /** the still's own class (its box and position), shared by the placeholder */
  className?: string;
  /** IntersectionObserver rootMargin: how close counts as near */
  margin?: string;
  children: ReactNode;
}) {
  const [near, setNear] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [margin]);
  if (near) return <span className={className}>{children}</span>;
  return (
    <span ref={ref} className={className} role="img" aria-label={alt} data-deferred="">
      <noscript>{children}</noscript>
    </span>
  );
}
