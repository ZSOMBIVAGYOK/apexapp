// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { SegmentedControl } from "./SegmentedControl";
import { Tabs } from "./Tabs";
import { useAppearanceStore } from "../lib/appearance/appearanceStore";

describe("Sliding Lens & Appearance Stability", () => {
  it("renders SegmentedControl without infinite loop even when options array is recreated on every render", () => {
    let renderCount = 0;

    const Wrapper = () => {
      const [val, setVal] = useState("a");
      renderCount++;

      // Intentionally pass a new array literal on every render
      const options = [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" }
      ];

      return (
        <div>
          <span data-testid="count">{renderCount}</span>
          <SegmentedControl options={options} value={val} onChange={setVal} />
        </div>
      );
    };

    const { getByTestId, getByText } = render(<Wrapper />);

    // Renders once or twice (initial mount + effect sync), definitely not looping (>10)
    expect(renderCount).toBeLessThan(5);

    // Clicking option B switches without loop
    act(() => {
      fireEvent.click(getByText("Option B"));
    });

    expect(renderCount).toBeLessThan(7);
    expect(getByTestId("count").textContent).toBe(String(renderCount));
  });

  it("renders Tabs without infinite loop even when tabs array is recreated on every render", () => {
    let renderCount = 0;

    const Wrapper = () => {
      const [activeTab, setActiveTab] = useState("tab1");
      renderCount++;

      // Intentionally pass a new array literal on every render
      const tabs = [
        { id: "tab1", label: "Tab 1" },
        { id: "tab2", label: "Tab 2" }
      ];

      return (
        <div>
          <span data-testid="tab-count">{renderCount}</span>
          <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} variant="pill" />
        </div>
      );
    };

    const { getByTestId, getByText } = render(<Wrapper />);

    expect(renderCount).toBeLessThan(5);

    act(() => {
      fireEvent.click(getByText("Tab 2"));
    });

    expect(renderCount).toBeLessThan(7);
    expect(getByTestId("tab-count").textContent).toBe(String(renderCount));
  });

  it("appearanceStore setters are idempotent and do not trigger extra renders for same values", () => {
    const store = useAppearanceStore.getState();
    const currentTheme = store.theme;
    const currentGlass = store.glass;

    let subscriberCalls = 0;
    const unsub = useAppearanceStore.subscribe(() => {
      subscriberCalls++;
    });

    // Setting identical theme should bail out
    act(() => {
      store.setTheme(currentTheme);
      store.setGlass(currentGlass);
    });

    expect(subscriberCalls).toBe(0);

    unsub();
  });
});
