import { createRoot } from "react-dom/client";
import App from "./App.tsx";

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reasonMsg = String(event.reason?.message || event.reason || "");
    if (
      reasonMsg.includes("Failed to fetch") ||
      reasonMsg.includes("NetworkError") ||
      (event.reason?.name === "TypeError" && reasonMsg.includes("fetch"))
    ) {
      console.warn("Handled background network/auth fetch exception:", event.reason);
      event.preventDefault();
    }
  });
}

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/_service-worker.js", { scope: "/" }).catch(() => {
      // Fallback to /sw.js if needed
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // SW registration failed silently
      });
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
