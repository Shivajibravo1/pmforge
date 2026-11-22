// PMForge notifications. Shows what the server pushed and opens PMForge when it is tapped.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = typeof data.title === "string" && data.title ? data.title : "PMForge";
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === "string" ? data.body : "",
    icon: "/icon.svg",
    data: { url: typeof data.url === "string" ? data.url : "/app" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/app", self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + "/app"; // never leave PMForge
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url === url && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
