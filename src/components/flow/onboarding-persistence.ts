const STORAGE_KEY = "wireframe:onboarded";

/**
 * Reads the "has seen onboarding" flag from localStorage. Returns false on
 * SSR, if nothing is saved, or if storage is unavailable (private mode/quota) —
 * never throws. Same SSR-safe pattern as `graph-persistence.ts`.
 */
export function hasSeenOnboarding(): boolean {
  if (globalThis.window === undefined) {
    return false;
  }
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Marks that the user has already gone through onboarding (don't show the welcome again). */
export function markOnboardingSeen(): void {
  if (globalThis.window === undefined) {
    return;
  }
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // quota full / private mode — silent: the welcome may reappear, no harm.
  }
}
