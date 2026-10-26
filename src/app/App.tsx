import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./routes";
import { initAuthListener } from "@features/auth/authStore";
import { initThemeListener } from "@shared/lib/theme/themeStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export const App: React.FC = () => {
  useEffect(() => {
    const unsubAuth = initAuthListener();
    const unsubTheme = initThemeListener();
    return () => {
      unsubAuth();
      unsubTheme();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

export default App;
