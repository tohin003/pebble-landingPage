// A text link that does a button's job, with a chevron that moves 2 px under the pointer (globals.css .chev;
// DESIGN-LEXINGTON §3.11): "View on GitHub ›", "Read the limits ›", "Read the transcript ›". The accent stays off it:
// ink, Inter 500. One per section head; the primary Download is the only filled button on a section.
//
// Routes of this site ("/film") go through next/link without prefetch (critic C9); anchors ("/#install", "#faq") and
// other sites are plain links.
import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

export type TextLinkProps = Readonly<{
  href: string;
  children: ReactNode;
  className?: string;
  /** client components only (the header's menu sheet closes itself) */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}>;

function isRoute(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/#");
}

export function TextLink({ href, children, className, onClick }: TextLinkProps) {
  const cls = `chev ${className ?? ""}`;
  if (isRoute(href)) {
    return (
      <Link href={href} prefetch={false} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} onClick={onClick}>
      {children}
    </a>
  );
}
