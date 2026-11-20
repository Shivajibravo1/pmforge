"use client";
import { createContext, useContext, type ReactNode } from "react";

/** Runtime settings read on the server from environment variables and handed to client components.
 *  Runtime (not NEXT_PUBLIC_ build-time) so one Docker image works with any pixel and checkout links. */
export type PublicConfig = { metaPixelId: string | null; monthlyUrl: string | null; yearlyUrl: string | null };

const Ctx = createContext<PublicConfig>({ metaPixelId: null, monthlyUrl: null, yearlyUrl: null });

export function PublicConfigProvider({ value, children }: { value: PublicConfig; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePublicConfig = () => useContext(Ctx);
