import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "admin_api_key";
const VIEW_KEY = "admin_view_active";
const VIEW_EVENT = "admin-view-changed";
const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

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
 * Admin mode activates when a key is stored AND the view toggle is on.
 * The toggle defaults to true when a key exists, and persists across refreshes.
 *
 * Returns:
 *   adminKey        – the stored API key (string, may be "")
 *   isAdmin         – true when admin mode is active (key present + view toggle on)
 *   showAdmin       – true when the admin UI should be shown (?admin in URL or key already stored)
 *   adminViewActive – whether the view toggle is on
 *   toggleAdminView – flip the view toggle
 *   setAdminKey     – persist a new key (or "" to clear)
 */
export default function useAdmin() {
  // One-time migration on first call
  useState(() => migrateKey());

  const location = useLocation();
  const hasAdminParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.has("admin");
  }, [location.search]);

  const [adminKey, setAdminKeyState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });

  // null = unchecked, true = valid, false = invalid
  const [isKeyValid, setIsKeyValid] = useState(null);

  const [adminViewActive, setAdminViewActive] = useState(() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY);
      // Default to true if key exists and no explicit preference saved
      if (stored === null) return !!localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    } catch { return false; }
  });

  // Listen for toggle changes from other useAdmin() instances
  useEffect(() => {
    const handler = () => {
      try {
        const val = localStorage.getItem(VIEW_KEY);
        setAdminViewActive(val === "true");
      } catch { /* ignore */ }
    };
    window.addEventListener(VIEW_EVENT, handler);
    return () => window.removeEventListener(VIEW_EVENT, handler);
  }, []);

  // Verify key against server on mount and when key changes
  useEffect(() => {
    if (!adminKey) {
      setIsKeyValid(null);
      return;
    }
    let cancelled = false;
    fetch(`${RELAY_URL}/api/admin/verify`, {
      headers: { "x-api-key": adminKey },
    })
      .then((res) => {
        if (!cancelled) setIsKeyValid(res.ok);
      })
      .catch(() => {
        if (!cancelled) setIsKeyValid(null); // network error → unknown
      });
    return () => { cancelled = true; };
  }, [adminKey]);

  // Show admin UI if URL param present OR if key was previously stored
  const showAdmin = hasAdminParam || !!adminKey;
  const isAdmin = !!adminKey && adminViewActive;

  const setAdminKey = useCallback((key) => {
    try {
      if (key) {
        localStorage.setItem(STORAGE_KEY, key);
        // Default view to active when key is first set
        if (!localStorage.getItem(VIEW_KEY)) {
          localStorage.setItem(VIEW_KEY, "true");
          setAdminViewActive(true);
          window.dispatchEvent(new Event(VIEW_EVENT));
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(VIEW_KEY);
        setAdminViewActive(false);
        window.dispatchEvent(new Event(VIEW_EVENT));
      }
    } catch { /* ignore */ }
    setAdminKeyState(key || "");
  }, []);

  const toggleAdminView = useCallback(() => {
    setAdminViewActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VIEW_KEY, String(next));
      } catch { /* ignore */ }
      window.dispatchEvent(new Event(VIEW_EVENT));
      return next;
    });
  }, []);

  return { adminKey, isAdmin, showAdmin, adminViewActive, toggleAdminView, setAdminKey, isKeyValid };
}
