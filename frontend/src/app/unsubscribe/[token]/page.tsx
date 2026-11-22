"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

// Opening the link never unsubscribes by itself: mail scanners open links. The button does the work.
export default function Unsubscribe() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function go() {
    setState("busy");
    try {
      const res = await fetch(`/public/interview/unsubscribe/${encodeURIComponent(token)}`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-5 py-16">
      <h1 className="text-2xl font-bold">PM<span className="text-lime">Forge</span></h1>
      <Card>
        {state === "done" ? (
          <p className="text-sm">You are unsubscribed. You will not get these emails any more. You can turn them on again from the You page.</p>
        ) : (
          <>
            <p className="text-sm">Stop these emails from PMForge?</p>
            <div className="mt-3">
              <Button disabled={state === "busy"} onClick={go}>Unsubscribe</Button>
            </div>
            {state === "error" && <p className="mt-2 text-sm text-muted">That did not work. Please try again.</p>}
          </>
        )}
      </Card>
    </main>
  );
}
