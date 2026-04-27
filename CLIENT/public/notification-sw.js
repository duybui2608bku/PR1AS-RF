self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "PR1AS", body: event.data.text() };
    }
  }

  const title = payload.title || "PR1AS";
  const options = {
    body: payload.body || "",
    data: payload,
    icon: "/window.svg",
    badge: "/window.svg",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(link);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(link);
        }
      }
    )
  );
});
