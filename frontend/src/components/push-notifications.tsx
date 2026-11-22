"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Notice } from "@/components/ui";
import { ApiError, api, friendly, useApi } from "@/lib/api";

type Status = { available: boolean; public_key: string; needs_consent: boolean; endpoints: string[] };

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const subscribeNever = () => () => {};
const browserCanPush = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// Turning notifications on is per device: the browser asks its own permission, and we store that device only.
export function PushNotifications() {
  const s = useApi<Status>("/api/v1/push");
  const supported = useSyncExternalStore(subscribeNever, browserCanPush, () => null); // null while rendering on the server
  const [here, setHere] = useState<string | null>(null); // this device's endpoint when already subscribed
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!browserCanPush()) return;
    navigator.serviceWorker.getRegistration("/sw.js").then((r) => r?.pushManager.getSubscription()).then((sub) => setHere(sub?.endpoint ?? null)).catch(() => setHere(null));
  }, []);

  if (s.error || !s.data || supported === null || !s.data.available || s.data.needs_consent) return null;
  const d = s.data;
  const on = here !== null && d.endpoints.includes(here);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setMsg("Notifications are blocked in this browser. Allow them in the site settings and try again.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(d.public_key) }));
      const j = sub.toJSON();
      await api("/api/v1/push/subscribe", { method: "POST", body: { endpoint: j.endpoint, keys: j.keys } });
      setHere(sub.endpoint);
      await s.reload();
    } catch (e) {
      setMsg(e instanceof ApiError ? friendly(e) : "Could not turn notifications on in this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api("/api/v1/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setHere(null);
      await s.reload();
    } catch (e) {
      setMsg(e instanceof ApiError ? friendly(e) : "Could not turn notifications off.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <h3 className="text-sm font-semibold">Notifications on this device</h3>
      {!supported ? (
        <p className="mt-1 text-sm text-muted">This browser cannot show notifications. On iPhone, use Share, then Add to Home Screen, and open PMForge from there.</p>
      ) : on ? (
        <>
          <p className="mt-1 text-sm text-muted">On for this device.</p>
          <div className="mt-2"><Button variant="ghost" disabled={busy} onClick={disable}>Turn off here</Button></div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">Get the same tips and offers as a notification. Your browser will ask for permission.</p>
          <div className="mt-2"><Button disabled={busy} onClick={enable}>Allow notifications</Button></div>
        </>
      )}
      {msg && <Notice>{msg}</Notice>}
    </div>
  );
}
