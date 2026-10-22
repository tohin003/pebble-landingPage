"use client";
// "Send yourself the link" for visitors who aren't on a Mac (DESIGN §7, MASTER_PLAN §7.4): the system share sheet
// where there is one (navigator.share), otherwise the address is copied and the button says so for a moment.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { cta } from "@/content/copy";

export function ShareLinkButton({
  label = cta.nonMac.share,
  className,
  iconClassName,
  children,
}: {
  label?: string;
  className?: string;
  iconClassName?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    const url = `${window.location.origin}/`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: cta.nonMac.shareTitle, text: cta.nonMac.shareText, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return; // the visitor closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2600);
    } catch {
      window.prompt(cta.nonMac.copyLink, url); // last resort: let the visitor copy it by hand
    }
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {copied ? (
        <Icon name="Check" className={iconClassName} />
      ) : (
        <Icon name="ShareNetwork" className={iconClassName} />
      )}
      <span>{copied ? cta.nonMac.copied : label}</span>
      {children}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? cta.nonMac.copied : ""}
      </span>
    </button>
  );
}
