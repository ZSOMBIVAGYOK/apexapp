import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { ProtectedRoute } from "@features/auth/components/ProtectedRoute";
import { NotFoundPage } from "@shared/ui/NotFoundPage";
import { Loader2 } from "lucide-react";
import i18n from "@shared/lib/i18n";

// Lazy-loaded routes for all features
const AuthPage = lazy(() => import("@features/auth/pages/AuthPage"));
const OnboardingPage = lazy(() => import("@features/onboarding/pages/OnboardingPage"));
const TodayPage = lazy(() => import("@features/today/pages/TodayPage"));
const CheckinPage = lazy(() => import("@features/checkin/pages/CheckinPage"));
const TrainingPage = lazy(() => import("@features/training/pages/TrainingPage"));
const NutritionPage = lazy(() => import("@features/nutrition/pages/NutritionPage"));
const DevicesPage = lazy(() => import("@features/devices/pages/DevicesPage"));
const CoachPage = lazy(() => import("@features/coach/pages/CoachPage"));
const InsightsPage = lazy(() => import("@features/insights/pages/InsightsPage"));
const SettingsPage = lazy(() => import("@features/settings/pages/SettingsPage"));

const SuspenseFallback: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-[50vh] flex-col items-center justify-center text-slate-400"
  >
    <Loader2 className="h-8 w-8 animate-spin text-apex-500" aria-hidden="true" />
    <span className="mt-3 text-xs font-medium">{i18n.t("common.loading")}</span>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/auth",
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <AuthPage />
      </Suspense>
    )
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <TodayPage />
          </Suspense>
        )
      },
      {
        path: "onboarding",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <OnboardingPage />
          </Suspense>
        )
      },
      {
        path: "checkin",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <CheckinPage />
          </Suspense>
        )
      },
      {
        path: "training",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <TrainingPage />
          </Suspense>
        )
      },
      {
        path: "nutrition",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <NutritionPage />
          </Suspense>
        )
      },
      {
        path: "devices",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <DevicesPage />
          </Suspense>
        )
      },
      {
        path: "coach",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <CoachPage />
          </Suspense>
        )
      },
      {
        path: "insights",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <InsightsPage />
          </Suspense>
        )
      },
      {
        path: "settings",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <SettingsPage />
          </Suspense>
        )
      },
      {
        path: "today",
        element: <Navigate to="/" replace />
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
