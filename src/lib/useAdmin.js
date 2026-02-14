import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "admin_api_key";

// Legacy keys to migrate from
const LEGACY_KEYS = ["chat_admin_key", "clips_admin_key"];

function migrateKey() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return;
    for (const key of LEGACY_KEYS) {
      const val = localStorage.getItem(key);
      if (val) {
        localStorage.setItem(STORAGE_KEY, val);
        localStorage.removeItem(key);
        return;
      }
    }
  } catch { /* ignore */ }
}

/**
 * Unified admin hook.
 *
 * Admin mode activates when `?admin` is in the URL AND a key is stored.
 * The key is shared across all pages (Clips, News, Admin, Chat).
 *
 * Returns:
 *   adminKey   – the stored API key (string, may be "")
 *   isAdmin    – true when admin mode is active (URL param + key present)
 *   showAdmin  – true when the admin UI should be shown (?admin in URL or key already stored)
 *   setAdminKey – persist a new key (or "" to clear)
 */
export default function useAdmin() {
  // One-time migration on first call
  useState(() => migrateKey());

  const location = useLocation();
  const hasAdminParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.has("admin") || params.get("edit") === "1";
  }, [location.search]);

  const [adminKey, setAdminKeyState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });

  // Show admin UI if URL param present OR if key was previously stored
  const showAdmin = hasAdminParam || !!adminKey;
  const isAdmin = showAdmin && !!adminKey;

  const setAdminKey = useCallback((key) => {
    try {
      if (key) {
        localStorage.setItem(STORAGE_KEY, key);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }
    setAdminKeyState(key || "");
  }, []);

  return { adminKey, isAdmin, showAdmin, setAdminKey };
}
