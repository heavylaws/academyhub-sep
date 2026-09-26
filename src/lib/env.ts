/**
 * Mock mode (localStorage-backed Convex client + persona auth) runs automatically
 * if VITE_CONVEX_URL is not configured or if VITE_LOCAL_DEV=true is set.
 */
export const isLocalDev =
  import.meta.env.VITE_LOCAL_DEV === "true" ||
  !import.meta.env.VITE_CONVEX_URL ||
  import.meta.env.VITE_CONVEX_URL.trim() === "";
