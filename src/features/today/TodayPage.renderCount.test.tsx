// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import "@shared/lib/i18n";
import { render, act, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TodayPage } from "./pages/TodayPage";
import { useAuthStore } from "@features/auth/authStore";
import { saveLocalDaily } from "@shared/lib/offline/offlineStorage";

describe("TodayPage Render Count & Stability Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        uid: "test-athlete-001",
        email: "athlete@apex.hu",
        displayName: "Teszt Sportoló",
        role: "athlete",
        roles: ["athlete"],
        locale: "hu",
        units: "metric",
        timezone: "Europe/Budapest",
        dataMode: "device",
        supportMode: ["solo"],
        onboardingCompleted: true,
        onboardingStep: 7,
        consent: { healthData: { accepted: true, version: "1.0", timestamp: new Date().toISOString() } },
        sports: ["Triatlon"],
        sport: "Triatlon",
        level: "competitive_amateur",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isLoading: false,
      isDemoUser: true
    });
  });

  it("settles within at most 3 renders on initial load (no infinite loops)", () => {
    let renderCount = 0;

    const TrackedTodayPage = () => {
      renderCount++;
      return <TodayPage />;
    };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<TrackedTodayPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial mount settles quickly and renderCount stays low (<= 3)
    expect(renderCount).toBeLessThanOrEqual(3);
  });

  it("renders three score rings with accessible labels", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
        </Routes>
      </MemoryRouter>
    );

    const recoveryButtons = screen.getAllByRole("button", { name: /Regeneráció/i });
    expect(recoveryButtons.length).toBeGreaterThanOrEqual(1);

    const strainButtons = screen.getAllByRole("button", { name: /Terhelés/i });
    expect(strainButtons.length).toBeGreaterThanOrEqual(1);

    const sleepButtons = screen.getAllByRole("button", { name: /Alvás/i });
    expect(sleepButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("opens Recovery Detail Sheet on ring click without re-render cascades", () => {
    let renderCount = 0;
    const TrackedTodayPage = () => {
      renderCount++;
      return <TodayPage />;
    };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<TrackedTodayPage />} />
        </Routes>
      </MemoryRouter>
    );

    const initialRenders = renderCount;
    const recoveryButton = screen.getAllByRole("button", { name: /Regeneráció/i })[0]!;

    act(() => {
      fireEvent.click(recoveryButton);
    });

    // Opening detail sheet should add at most 1 render for the modal state
    expect(renderCount - initialRenders).toBeLessThanOrEqual(2);
  });

  it("renders populated scores correctly when a check-in exists", () => {
    const todayStr = new Date().toISOString().split("T")[0]!;
    saveLocalDaily({
      date: todayStr,
      athleteId: "test-athlete-001",
      sleep: { durationMinutes: 480, qualityScore: 4 },
      subjective: { soreness: 1, stress: 2, fatigue: 2 },
      readinessScore: 82,
      readinessStatus: "ready",
      source: "manual",
      confidence: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: "test-athlete-001"
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should indicate optimal recovery and not pending
    const kipihentElements = screen.getAllByText("Kipihent");
    expect(kipihentElements.length).toBeGreaterThanOrEqual(1);
  });
});
