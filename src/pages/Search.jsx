import React from "react";
import { Redirect, useLocation } from "react-router-dom";

// /search moved into /chat, whose header field filters the stream. Old links
// carried ?q=, ?qmode=player and ?qsince=; map them onto ?q=, ?player=,
// ?since= (the chat seeds its field from q or player and ignores since).
const SINCE_KEYS = new Set(["24h", "7d", "30d", "all"]);

export function searchRedirectTarget(search) {
  const sp = new URLSearchParams(search);
  const out = new URLSearchParams();
  const q = (sp.get("q") || "").trim();
  const player = (sp.get("player") || "").trim();
  if (sp.get("qmode") === "player") {
    if (q) out.set("player", q);
  } else {
    if (q) out.set("q", q);
    if (player) out.set("player", player);
  }
  const sinceRaw = sp.has("since") ? sp.get("since") : sp.get("qsince");
  if (sinceRaw !== null) {
    // the old page's empty qsince meant "all time"
    const since = sinceRaw === "" ? "all" : sinceRaw;
    if (SINCE_KEYS.has(since)) out.set("since", since);
  }
  const qs = out.toString();
  return `/chat${qs ? `?${qs}` : ""}`;
}

const Search = () => {
  const { search } = useLocation();
  return <Redirect to={searchRedirectTarget(search)} />;
};

export default Search;
