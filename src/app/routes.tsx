import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { ProtectedRoute } from "@features/auth/components/ProtectedRoute";
import { NotFoundPage } from "@shared/ui/NotFoundPage";
import { ErrorBoundary } from "@shared/ui/ErrorBoundary";
import { Loader2 } from "lucide-react";
import i18n from "@shared/lib/i18n";

// Lazy-loaded routes for all features
const AuthPage = lazy(() => import("@features/auth/pages/AuthPage"));
const OnboardingPage = lazy(() => import("@features/onboarding/pages/OnboardingPage"));
const PrivacyPolicyPage = lazy(() => import("@features/settings/pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("@features/settings/pages/TermsPage"));
const TodayPage = lazy(() => import("@features/today/pages/TodayPage"));
const CheckinPage = lazy(() => import("@features/checkin/pages/CheckinPage"));
const TrainingPage = lazy(() => import("@features/training/pages/TrainingPage"));
const NutritionPage = lazy(() => import("@features/nutrition/pages/NutritionPage"));
const DevicesPage = lazy(() => import("@features/devices/pages/DevicesPage"));
const CoachPage = lazy(() => import("@features/coach/pages/CoachPage"));
const InsightsPage = lazy(() => import("@features/insights/pages/InsightsPage"));
const SettingsPage = lazy(() => import("@features/settings/pages/SettingsPage"));
const SharingSettingsPage = lazy(() => import("@features/settings/pages/SharingSettingsPage"));
const ProfilePage = lazy(() => import("@features/profile/pages/ProfilePage"));
const DesignSystemPage = lazy(() => import("@features/design/pages/DesignSystemPage"));

const SuspenseFallback: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-[50vh] flex-col items-center justify-center text-text-secondary"
  >
    <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden="true" />
    <span className="mt-3 text-12 font-medium">{i18n.t("common.loading")}</span>
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
    path: "/privacy",
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <PrivacyPolicyPage />
      </Suspense>
    )
  },
  {
    path: "/terms",
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <TermsPage />
      </Suspense>
    )
  },
  {
    path: "/onboarding",
    element: (
      <ProtectedRoute allowIncompleteOnboarding>
        <ErrorBoundary fallbackTitle="Hiba történt a regisztrációs varázslóban">
          <Suspense fallback={<SuspenseFallback />}>
            <OnboardingPage />
          </Suspense>
        </ErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout />
        </ErrorBoundary>
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
        path: "sleep",
        element: <Navigate to="/insights?tab=sleep" replace />
      },
      {
        path: "recovery",
        element: <Navigate to="/insights" replace />
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
        path: "settings/sharing",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <SharingSettingsPage />
          </Suspense>
        )
      },
      {
        path: "profile",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <ProfilePage />
          </Suspense>
        )
      },
      {
        path: "design",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <DesignSystemPage />
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
