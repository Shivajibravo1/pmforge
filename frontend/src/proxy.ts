import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request Content Security Policy with a nonce (Next.js 16 proxy convention).
 * Pages are rendered dynamically so the framework can attach the nonce to its own scripts.
 * `style-src-attr 'unsafe-inline'` is limited to style="" attributes that existing lesson components use;
 * inline <style> and all scripts still require the nonce.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    // facebook.com: Meta Pixel beacons, sent only after the visitor allows them (components/meta-pixel.tsx).
    // The pixel script itself loads under 'strict-dynamic' because our nonce-trusted bundle inserts it.
    "img-src 'self' blob: data: https://www.facebook.com",
    "font-src 'self'",
    "connect-src 'self' https://www.facebook.com https://connect.facebook.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
