"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** True when the person asked the system for less motion. Safe on the server (returns false). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Sets `seen` once the element has entered the viewport. It never flips back. */
export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
      const raf = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/**
 * Wraps content and exposes `data-in="true"` once visible, so CSS can run an entrance.
 * Without JavaScript, or with reduced motion, the content is simply visible.
 */
export function InView({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "ol" | "ul" }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.2);
  const T = Tag as "div";
  return (
    <T ref={ref} data-in={seen ? "true" : "false"} className={className}>
      {children}
    </T>
  );
}

/** Counts from 0 to `to` when scrolled into view. Server render and reduced motion show the final number. */
export function CountUp({ to, ms = 1100, suffix = "" }: { to: number; ms?: number; suffix?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.4);
  const [n, setN] = useState(to);
  useEffect(() => {
    if (!seen || prefersReducedMotion()) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / ms, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, ms]);
  return (
    <span ref={ref} aria-label={`${to}${suffix}`}>
      <span aria-hidden>{n}{suffix}</span>
    </span>
  );
}
