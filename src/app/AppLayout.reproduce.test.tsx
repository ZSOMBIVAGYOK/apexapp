// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import "@shared/lib/i18n";
import { render, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { TodayPage } from "@features/today/pages/TodayPage";
import { useAuthStore } from "@features/auth/authStore";
import { useAppearanceStore } from "@shared/lib/appearance/appearanceStore";
import { UserProfile } from "@shared/types";

describe("AppLayout render stability and loop prevention", () => {
  it("renders AppLayout with TodayPage on / without maximum update depth exceeded", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<TodayPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container).toBeDefined();
  });

  it("handles window resize without triggering render loop", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<TodayPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    act(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("resize"));
    });

    expect(container).toBeDefined();
  });

  it("handles user role changes and theme toggles without infinite loops", () => {
    // Set athlete user
    useAuthStore.setState({
      user: {
        uid: "test-athlete",
        email: "athlete@apex.local",
        displayName: "Test Athlete",
        role: "athlete",
        roles: ["athlete"],
        locale: "hu",
        units: "metric",
        timezone: "Europe/Budapest",
        dataMode: "cloud",
        supportMode: ["in_app"],
        onboardingCompleted: true,
        consent: { healthData: "granted" },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01"
      } as unknown as UserProfile
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<TodayPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Toggle theme
    act(() => {
      useAppearanceStore.getState().setTheme("light");
      useAppearanceStore.getState().setTheme("dark");
    });

    // Toggle role mode to coach
    act(() => {
      useAuthStore.setState({
        user: {
          uid: "test-coach",
          email: "coach@apex.local",
          displayName: "Test Coach",
          role: "coach",
          roles: ["athlete", "coach"],
          locale: "hu",
          units: "metric",
          timezone: "Europe/Budapest",
          dataMode: "cloud",
          supportMode: ["in_app"],
          onboardingCompleted: true,
          consent: { healthData: "granted" },
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01"
        } as unknown as UserProfile
      });
    });

    expect(container).toBeDefined();
  });
});
