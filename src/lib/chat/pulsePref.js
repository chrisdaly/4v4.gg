import { useCallback, useState } from "react";

/** localStorage key for the Pulse column: "1" (default, shown) / "0". */
export const PULSE_PREF_KEY = "chat:showPulse";

export function readPulsePref() {
  try {
    const v = localStorage.getItem(PULSE_PREF_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function writePulsePref(value) {
  try {
    localStorage.setItem(PULSE_PREF_KEY, value ? "1" : "0");
  } catch {
    // non-persistent is fine
  }
}

/** [showPulse, togglePulse]: the persisted Pulse column preference. */
export function usePulsePref() {
  const [showPulse, setShowPulse] = useState(readPulsePref);
  const togglePulse = useCallback(() => {
    setShowPulse((v) => {
      writePulsePref(!v);
      return !v;
    });
  }, []);
  return [showPulse, togglePulse];
}
