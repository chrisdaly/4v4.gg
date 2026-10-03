import { useState, useEffect } from "react";
import { getSeasons } from "./api";

// Last-resort fallback when the seasons endpoint returns nothing
const FALLBACK_SEASON = 24;

/**
 * Fetch available W3Champions seasons.
 *
 * Returns:
 *   seasons       – array of season objects (newest first, as returned by the API)
 *   currentSeason – id of the latest season (null while loading, FALLBACK_SEASON if the fetch fails)
 *   loading       – true until the fetch settles
 *   error         – fetch error, if any
 */
export default function useSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSeasons()
      .then((data) => {
        if (cancelled) return;
        // The endpoint lists season 0, which holds no 4v4 games at all - its
        // ladder comes back empty for every league. Left in, it is a season
        // picker entry that always leads to a blank page.
        const playable = Array.isArray(data) ? data.filter((s) => s.id > 0) : [];
        setSeasons(playable);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const currentSeason = seasons.length > 0
    ? seasons[0].id
    : (loading ? null : FALLBACK_SEASON);

  return { seasons, currentSeason, loading, error };
}
