import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

const base = "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-50 min-h-11";

export function Button({ children, variant = "primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "lime" | "ghost" }) {
  const styles = {
    primary: "bg-violet text-white hover:brightness-110",
    lime: "bg-lime text-black hover:brightness-95",
    ghost: "border border-line text-white hover:bg-surface2",
  }[variant];
  return <button {...rest} className={`${base} ${styles} ${rest.className ?? ""}`}>{children}</button>;
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "lime" | "ghost" }) {
  const styles = {
    primary: "bg-violet text-white hover:brightness-110",
    lime: "bg-lime text-black hover:brightness-95",
    ghost: "border border-line text-white hover:bg-surface2",
  }[variant];
  return <Link href={href} className={`${base} ${styles}`}>{children}</Link>;
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "lime" | "violet" }) {
  const t = { muted: "bg-surface2 text-muted", lime: "bg-lime text-black", violet: "bg-violet text-white" }[tone];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${t}`}>{children}</span>;
}

export function Notice({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-xl border border-line bg-surface2 p-3 text-sm text-white">{children}</p>;
}

export function Spinner() {
  return <p className="p-6 text-sm text-muted" role="status">Loading</p>;
}
