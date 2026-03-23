import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App.jsx";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: toNumber(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0),
  });
}

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
    <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please reload the page.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
