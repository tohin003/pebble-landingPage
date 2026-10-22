"use client";
// One animated pebble at a time (Pebble's rule, Avatar.vue F12): every live pebble registers here, a single shared
// IntersectionObserver measures how much of each is on screen, and only the most visible one (the largest visible
// area; the first registered wins a tie) may animate. The others show a settled still frame.
//
// Also here: useMotionAllowed(), false under prefers-reduced-motion or the site's "Pause motion" toggle
// (html[data-motion="paused"]).
import { useEffect, useId, useSyncExternalStore, type RefObject } from "react";

interface Entry {
  el: Element;
  area: number;
  order: number;
  enabled: boolean;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let observer: IntersectionObserver | null = null;
let elected: string | null = null;
let version = 0;
let order = 0;

function notify() {
  version++;
  for (const l of listeners) l();
}

function elect() {
  let best: [string, Entry] | null = null;
  for (const item of entries) {
    const e = item[1];
    if (!e.enabled || e.area <= 0) continue;
    if (!best || e.area > best[1].area + 1 || (Math.abs(e.area - best[1].area) <= 1 && e.order < best[1].order)) best = item;
  }
  elected = best ? best[0] : null;
}

function onIntersect(records: IntersectionObserverEntry[]) {
  for (const r of records) {
    for (const e of entries.values()) {
      if (e.el === r.target) e.area = r.isIntersecting ? r.intersectionRect.width * r.intersectionRect.height : 0;
    }
  }
  elect();
  notify();
}

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(onIntersect, { threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 1] });
  return observer;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const getVersion = () => version;
const getServerVersion = () => 0;

/**
 * Register a pebble's element. `active`: this pebble may animate (it is the most visible one). `visible`: some of it
 * is on screen. `enabled` false (motion not allowed) keeps it out of the election.
 */
export function usePebbleConductor(ref: RefObject<Element | null>, enabled: boolean): { active: boolean; visible: boolean } {
  const id = useId();
  useSyncExternalStore(subscribe, getVersion, getServerVersion);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    entries.set(id, { el, area: 0, order: order++, enabled });
    getObserver().observe(el);
    return () => {
      getObserver().unobserve(el);
      entries.delete(id);
      elect();
      notify();
    };
    // `enabled` is left out on purpose: the effect below syncs it, and re-registering would reset the measured area.
  }, [id, ref]);

  useEffect(() => {
    const e = entries.get(id);
    if (!e || e.enabled === enabled) return;
    e.enabled = enabled;
    elect();
    notify();
  }, [id, enabled]);

  const entry = entries.get(id);
  return { active: elected === id, visible: !!entry && entry.area > 0 };
}

const REDUCED = "(prefers-reduced-motion: reduce)";

function motionAllowed(): boolean {
  return !(window.matchMedia(REDUCED).matches || document.documentElement.dataset.motion === "paused");
}
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  const watcher = new MutationObserver(onChange);
  watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    query.removeEventListener("change", onChange);
    watcher.disconnect();
  };
}

/** False under prefers-reduced-motion or html[data-motion="paused"] (and during server rendering). */
export function useMotionAllowed(): boolean {
  return useSyncExternalStore(subscribeMotion, motionAllowed, () => false);
}
