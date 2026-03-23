import { API_BASE } from "../config";

const DEFAULT_TIMEOUT_MS = 15000;

function joinUrl(base, path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedBase = String(base || "").replace(/\/$/, "");
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function decodePayload(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function deriveErrorMessage(response, text, payload) {
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;

  if (typeof text === "string" && /<html|<!doctype/i.test(text)) {
    return "API returned HTML instead of JSON. Check VITE_API_BASE and backend routing.";
  }

  return `Request failed with status ${response.status}`;
}

export async function apiRequest(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = options;
  const url = joinUrl(API_BASE, path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = decodePayload(text);

    if (!response.ok) {
      throw new Error(deriveErrorMessage(response, text, payload));
    }

    if (!payload) {
      if (!text) return { success: true };
      throw new Error("API returned a non-JSON response.");
    }

    if (payload.success === false) {
      throw new Error(payload.error || payload.message || "API request failed");
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Check backend availability and network latency.");
    }

    if (error instanceof TypeError) {
      throw new Error("Cannot reach backend API. Verify server is running and VITE_API_BASE is correct.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
