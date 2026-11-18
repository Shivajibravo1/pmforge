"use client";
import { BookOpen, Briefcase, Flame, Home, MessageCircle, Shield, UserCircle, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui";
import { type Me, type Progress, useApi } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { isEnrolled } from "@/lib/enrollment";

const nav = [
  ["/app", "Today", Home],
  ["/app/course", "Course", BookOpen],
  ["/app/portfolio", "Portfolio", Briefcase],
  ["/app/mentor", "Mentor", MessageCircle],
  ["/app/you", "You", UserCircle],
] as const;

function Logo() {
  return (
    <Link href="/app" aria-label="PMForge, go to Today" className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#0d0d12" stroke="#2a2a35" />
        <path d="M18 48V16h16a10 10 0 0 1 0 20H26" fill="none" stroke="#C6FF34" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="46" cy="46" r="5" fill="#7E3BED" />
      </svg>
      <span className="text-lg font-bold">PM<span className="text-lime">Forge</span></span>
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const path = usePathname();
  const prog = useApi<Progress>(session ? "/api/v1/progress" : null);
  const me = useApi<Me>(session ? "/api/v1/me" : null);
  const { reload } = prog;
  const items = me.data?.role === "admin" ? [...nav, ["/app/admin", "Admin", Shield] as const] : nav;

  useEffect(() => {
    if (isPending) return;
    if (!session) router.replace("/sign-in");
    else if (!isEnrolled(session.user as { name?: string; phone?: unknown })) router.replace("/complete-profile");
  }, [isPending, session, router]);

  // Refresh streak and XP whenever the learner moves to another screen (for example after completing a lesson).
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!session) return;
    if (lastPath.current !== null && lastPath.current !== path) void reload();
    lastPath.current = path;
  }, [path, session, reload]);

  if (isPending || !session || !isEnrolled(session.user as { name?: string; phone?: unknown })) return <Spinner />;
  const xp = prog.data?.total_xp;
  const streak = prog.data?.streak;

  return (
    <div className="flex min-h-full w-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-black/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 md:flex-nowrap">
          <Logo />
          <nav aria-label="Primary" className="order-3 w-full md:order-none md:w-auto md:flex-1">
            <ul className="flex justify-between gap-1 md:justify-center">
              {items.map(([href, label, Icon]) => {
                const active = href === "/app" ? path === href : path.startsWith(href);
                return (
                  <li key={href} className="flex-1 md:flex-none">
                    <Link href={href} aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm transition ${active ? "bg-violet font-semibold text-white" : "text-muted hover:bg-surface2 hover:text-white"}`}>
                      <Icon aria-hidden className="h-4 w-4" /><span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2" aria-label="Your progress">
            <span className="flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 text-sm font-semibold" title="Day streak">
              <Flame aria-hidden className="h-4 w-4 text-lime" /><span>{streak ?? "-"}</span><span className="sr-only"> day streak</span>
            </span>
            <span className="flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 text-sm font-semibold" title="Experience points">
              <Zap aria-hidden className="h-4 w-4 text-lime" /><span>{xp?.toLocaleString() ?? "-"}</span><span className="sr-only"> XP</span>
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">{children}</main>
    </div>
  );
}
