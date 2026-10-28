/**
 * Apex Design System - Motion Tokens
 * Apple-like spring-feel easing and feedback curves.
 */

export const motion = {
  easings: {
    // Apple-like spring transition
    spring: "cubic-bezier(0.22, 1, 0.36, 1)",
    springSnappy: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  durations: {
    instant: "80ms",
    press: "120ms",
    fast: "200ms",
    normal: "280ms",
    slow: "420ms",
    hero: "600ms",
  },
  feedback: {
    pressedScale: "scale(0.97)",
    pressedBrightness: "brightness(1.05)",
  }
} as const;
