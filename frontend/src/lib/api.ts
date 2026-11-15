"use client";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "./auth-client";

// Same-origin by default: Vercel routes /api/v1/* to the backend. Set NEXT_PUBLIC_API_URL only for local dev.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

async function token(): Promise<string> {
  const res = await authClient.token();
  const t = res.data?.token;
  if (!t) throw new ApiError(401, "unauthenticated");
  return t;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20000), // never leave the screen loading forever
  });
  if (!res.ok) {
    let code = "request_failed";
    try {
      const j = await res.json();
      if (typeof j.detail === "string") code = j.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    api<T>(path)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof ApiError ? e : new ApiError(0, "network_error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = useCallback(async () => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

export type Level = { id: number; title: string; days: { day: number; type: string; title: string; phase: string }[] };
export type Curriculum = { free_lessons: number; levels: Level[] };
export type Progress = { completed: number[]; total_xp: number; streak: number };
export type Me = { id: string; email: string; role: string; tier: string };
export type Lesson = { day: number; type: string; title: string; phase: string; level: number; rubric: string[]; body: string | null; completed?: boolean };
export type CompleteOut = { day: number; xp_awarded: number; total_xp: number; streak: number; newly_completed: boolean };
export type ReviewOut = { review_id: string; score: number; strengths: string[]; gaps: string[]; next_steps: string[]; model_answer?: string; redacted?: string[] };

export const TYPE_LABEL: Record<string, string> = {
  C: "Concept", B: "Build", S: "Simulation", K: "Critique", P: "Portfolio", A: "Assessment", R: "Buffer",
};

export function friendly(e: ApiError | null): string {
  if (!e) return "";
  const map: Record<string, string> = {
    daily_limit_reached: "You have reached today's mentor limit. It resets tomorrow.",
    monthly_budget_reached: "You have used this month's AI budget.",
    previous_lesson_incomplete: "Complete the previous lesson first.",
    upgrade_required: "This lesson is part of the full program.",
    level_incomplete: "Finish every lesson in this level first.",
    content_not_allowed: "That text cannot be reviewed. Please rephrase it without sensitive or inappropriate content.",
  };
  return map[e.code] ?? "Something went wrong. Please try again.";
}
