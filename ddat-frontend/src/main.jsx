import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

if (typeof window !== "undefined" && typeof window.alert === "function") {
  const nativeAlert = window.alert.bind(window);
  window.__nativeAlert = nativeAlert;
  window.alert = (message) => {
    window.dispatchEvent(
      new CustomEvent("app:notice", {
        detail: {
          message: String(message || ""),
          type: "error",
        },
      })
    );
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
