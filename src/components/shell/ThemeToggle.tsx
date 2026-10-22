"use client";
// Light or dark (DESIGN §6). The label and icon switch in CSS on html[data-theme] (.only-light, .only-dark), so the
// server HTML is already right and nothing flashes or mismatches at hydration. The choice is stored (try/catch) by
// src/lib/theme.ts and applied before first paint on the next visit by the inline <head> script.
import { Icon } from "./icons";
import { controls } from "@/content/copy";
import { currentTheme, setTheme } from "@/lib/theme";
import styles from "./Toggle.module.css";

export function ThemeToggle({ variant = "icon", className }: { variant?: "icon" | "pill"; className?: string }) {
  const toggle = () => setTheme(currentTheme() === "dark" ? "light" : "dark");
  const icon = (
    <>
      <Icon name="Moon" className={`${styles.icon} only-light`} />
      <Icon name="Sun" className={`${styles.icon} only-dark`} />
    </>
  );
  if (variant === "pill") {
    return (
      <button type="button" className={`${styles.pill} ${className ?? ""}`} onClick={toggle}>
        {icon}
        <span className="only-light">{controls.theme.toDark}</span>
        <span className="only-dark">{controls.theme.toLight}</span>
      </button>
    );
  }
  return (
    <button type="button" className={`${styles.iconButton} ${className ?? ""}`} onClick={toggle} title={controls.theme.label}>
      {icon}
      <span className="sr-only only-light">{controls.theme.toDark}</span>
      <span className="sr-only only-dark">{controls.theme.toLight}</span>
    </button>
  );
}
