"use client";
import { useState } from "react";
import { Button, Card, Notice, Spinner } from "@/components/ui";
import { PushNotifications } from "@/components/push-notifications";
import { ApiError, api, friendly, useApi } from "@/lib/api";

type Status = { subscribed: boolean; email: string; consent_version: string; consent_text: string };

export function MarketingEmailCard() {
  const s = useApi<Status>("/api/v1/marketing-email");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function change(path: "subscribe" | "unsubscribe") {
    if (!s.data) return;
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/v1/marketing-email/${path}`, {
        method: "POST",
        body: path === "subscribe" ? { agree, consent_version: s.data.consent_version } : undefined,
      });
      setAgree(false);
      await s.reload();
    } catch (e) {
      setMsg(friendly(e instanceof ApiError ? e : null));
    } finally {
      setBusy(false);
    }
  }

  if (s.error) return null; // a failed bonus card must not break the rest of the page
  if (!s.data) return <Spinner />;
  const d = s.data;

  return (
    <Card>
      <h2 className="font-semibold">Tips and offers by email</h2>
      {d.subscribed ? (
        <>
          <p className="mt-1 text-sm text-muted">On. We send occasional tips and offers to {d.email}. Every email has an unsubscribe link.</p>
          <div className="mt-3">
            <Button variant="ghost" disabled={busy} onClick={() => change("unsubscribe")}>Turn off</Button>
          </div>
          <PushNotifications />
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">Optional. Off until you turn it on.</p>
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>{d.consent_text}</span>
          </label>
          <div className="mt-3">
            <Button disabled={!agree || busy} onClick={() => change("subscribe")}>Turn on</Button>
          </div>
        </>
      )}
      {msg && <Notice>{msg}</Notice>}
    </Card>
  );
}
