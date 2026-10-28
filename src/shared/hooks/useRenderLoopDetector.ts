import { useRef, useEffect } from "react";

interface RenderLoopOptions {
  maxRenders?: number;
  windowMs?: number;
}

/**
 * Development-only hook to detect runaway renders / potential infinite loops.
 * Emits a warning to console when a component exceeds `maxRenders` in `windowMs`.
 */
export function useRenderLoopDetector(
  componentName: string,
  options: RenderLoopOptions = {}
) {
  const { maxRenders = 50, windowMs = 1000 } = options;
  const renderTimestamps = useRef<number[]>([]);
  const warned = useRef(false);

  if (import.meta.env.DEV) {
    const now = performance.now();
    renderTimestamps.current.push(now);

    // Filter timestamps within the rolling window
    const windowStart = now - windowMs;
    renderTimestamps.current = renderTimestamps.current.filter((t) => t >= windowStart);

    if (renderTimestamps.current.length > maxRenders && !warned.current) {
      warned.current = true;
      console.warn(
        `[RenderLoopDetector] Possible infinite render loop detected in <${componentName}>: rendered ${renderTimestamps.current.length} times in ${windowMs}ms.`
      );
    }
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    // Reset warning state if renders quiet down
    const timer = setTimeout(() => {
      warned.current = false;
    }, windowMs * 2);
    return () => clearTimeout(timer);
  }, [windowMs]);
}
