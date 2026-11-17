import type { Metadata } from "next";

// The sign-in page should not appear in search results.
export const metadata: Metadata = {
  title: "Sign in | PMForge",
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
