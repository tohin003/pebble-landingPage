"use client";
// Pause motion (critic H4c: in the header and the footer). A toggle button: its name stays "Pause motion" and
// aria-pressed says whether motion is paused. It sets html[data-motion] (src/lib/motion.ts), which stops the CSS
// animations, the line's draw-on, the loops and the pebbles. When the system asks for reduced motion the page is
// already still and the site can't override that, so the button shows as pressed and unavailable.
import { Icon } from "./icons";
import { controls } from "@/content/copy";
import { useMotionMode } from "@/lib/hooks";
import { setMotionPaused } from "@/lib/motion";
import styles from "./Toggle.module.css";

export function MotionToggle({ variant = "icon", className }: { variant?: "icon" | "pill"; className?: string }) {
  const mode = useMotionMode(); // null until hydrated
  const pressed = mode === "paused" || mode === "reduced";
  const locked = mode === "reduced";
  const toggle = () => {
    if (locked) return;
    setMotionPaused(mode !== "paused");
  };
  const icon = <Icon name="Pause" className={styles.icon} />;
  if (variant === "pill") {
    return (
      <button
        type="button"
        className={`${styles.pill} ${styles.motion} ${className ?? ""}`}
        aria-pressed={pressed}
        aria-disabled={locked || undefined}
        onClick={toggle}
      >
        {icon}
        <span>{controls.motion.pause}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${styles.motion} ${className ?? ""}`}
      aria-pressed={pressed}
      aria-disabled={locked || undefined}
      aria-label={controls.motion.pause}
      title={controls.motion.pause}
      onClick={toggle}
    >
      {icon}
    </button>
  );
}
