/**
 * Mock mode (localStorage-backed Convex client + persona auth) is disabled when VITE_CONVEX_URL is present.
 * Ensures the app never falls back to LocalMockConvexClient or localMockStore when VITE_CONVEX_URL is configured.
 */
const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();

export const isLocalDev = Boolean(
  (!convexUrl || convexUrl === "") && import.meta.env.VITE_LOCAL_DEV === "true",
);

