// Custom service worker additions — appended by next-pwa
/* eslint-disable no-restricted-globals */

// Open app when user taps a notification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _sw = self as any;

_sw.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/";
  event.waitUntil(
    _sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((clients: any[]) => {
        const existing = clients.find((c: any) => c.url.includes(_sw.location.origin));
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        return _sw.clients.openWindow(url);
      })
  );
});
