import { useRegisterSW } from "virtual:pwa-register/react";

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates on window focus
      if (r && typeof window !== "undefined") {
        window.addEventListener("focus", () => {
          r.update().catch(() => {});
        });
        // Check every 30 minutes
        setInterval(() => {
          r.update().catch(() => {});
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.warn("PWA Service Worker registration error:", error);
    }
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const reload = () => {
    updateServiceWorker(true);
  };

  return {
    needRefresh,
    offlineReady,
    reload,
    close
  };
}
