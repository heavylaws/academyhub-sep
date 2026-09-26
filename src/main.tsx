import { createRoot } from "react-dom/client";
import App from "./App.tsx";

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed silently
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
