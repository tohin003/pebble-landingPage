"use client";
// The theme as words (DESIGN-LEXINGTON §6 Footer, "Appearance"): Light, Dark and System, as three toggle buttons in a
// labelled group; the chosen one is pressed. Light and Dark store the choice (src/lib/theme.ts); System forgets it and
// follows the system again. Nothing is pressed until the page has read the stored choice after hydration, so the
// server HTML never claims a choice it can't know. The header's icon toggle and this one stay in step.
import { useEffect, useState } from "react";
import { controls } from "@/content/copy";
import { clearTheme, setTheme, storedTheme, subscribeTheme } from "@/lib/theme";
import styles from "./Toggle.module.css";

type Choice = "light" | "dark" | "system";
const CHOICES: readonly Choice[] = ["light", "dark", "system"];

const read = (): Choice => storedTheme() ?? "system";

export function ThemeSwitch({ className }: { className?: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    setChoice(read());
    return subscribeTheme(() => setChoice(read()));
  }, []);

  const choose = (next: Choice) => {
    if (next === "system") clearTheme();
    else setTheme(next);
    setChoice(next);
  };

  return (
    <div role="group" aria-label={controls.theme.label} className={`${styles.segmented} ${className ?? ""}`}>
      {CHOICES.map((c) => (
        <button key={c} type="button" className={styles.option} aria-pressed={choice === c} onClick={() => choose(c)}>
          {controls.theme[c]}
        </button>
      ))}
    </div>
  );
}
