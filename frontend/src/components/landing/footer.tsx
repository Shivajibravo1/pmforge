import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
        <span>PMForge</span>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/refund" className="hover:text-white">Refunds</Link>
          <Link href="/sign-in?mode=signin" className="hover:text-white">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
