"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

const nav = [
  ["/app", "Today"],
  ["/app/course", "Course"],
  ["/app/portfolio", "Portfolio"],
  ["/app/mentor", "Mentor"],
  ["/app/you", "You"],
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, session, router]);

  if (isPending || !session) return <Spinner />;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-24">
      <main className="flex-1 px-5 py-6">{children}</main>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 border-t border-line bg-black/95 backdrop-blur">
        <ul className="mx-auto flex max-w-3xl">
          {nav.map(([href, label]) => {
            const active = href === "/app" ? path === href : path.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link href={href} aria-current={active ? "page" : undefined}
                  className={`block py-4 text-center text-sm ${active ? "font-semibold text-lime" : "text-muted"}`}>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
