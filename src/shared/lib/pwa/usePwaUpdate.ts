import { useRegisterSW } from "virtual:pwa-register/react";

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(r) {
      // eslint-disable-next-line no-console
      console.info("PWA Service Worker registered:", r?.scope);
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
