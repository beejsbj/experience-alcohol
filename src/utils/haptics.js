const HAPTIC_PATTERNS = {
  tap: [10],
  selection: [8],
  success: [14, 30, 10],
  warning: [18, 40, 18],
};

export const triggerHaptic = (type = "tap") => {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }

  navigator.vibrate(HAPTIC_PATTERNS[type] || HAPTIC_PATTERNS.tap);
};
