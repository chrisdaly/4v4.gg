import { useState, useEffect, useRef, useMemo } from "react";

const NAMES = [
  "Shocker", "Compre", "Cechi", "GoldLich", "FOALS", "xilroNGlu",
  "VaSilliSaY", "KillNostra", "NightOwl", "FrostByte", "IronWolf",
  "StormBlade", "DarkHunter", "MoonRiser", "FireStrike", "IceVenom",
  "ThunderAxe", "ShadowFang", "BloodRaven", "SkyLance", "GrimReaper",
  "PhantomKing", "CrystalMage", "DeathKnight", "WildHeart", "NetherLord",
  "SoulReaver", "TideCaller", "EarthShaker", "WindRunner", "BladeMaster",
  "FlameWitch", "ArcaneShot", "BattleCrow", "RuneForge", "LightBringer",
  "VoidWalker", "WarChief", "SpellBreak", "DoomHammer", "ChainFrost",
  "ManaStorm", "Corruption", "HolySmite", "BaneStrike", "DuskFury",
  "PrismShock", "AxeGrinder", "CryptLord", "StarFall", "Earthbind",
  "InfernoX", "GlacierK", "Revenant", "OathKeeper", "NightmareZ",
  "EclipseX", "Tempest", "Zenith", "Oblivion", "Cascade",
  "Wraith", "Exodus", "Chimera", "Paradox", "Arsenal",
  "Havoc", "Rampage", "Vortex", "TitanX", "Genesis",
  "PhoenixZ", "Nebula", "ApexHero", "Catalyst", "Enigma",
  "FuryX", "Phantom", "BlitzKrg", "Recon", "OracleX",
  "Legion", "Cipher", "NovaX", "Rogue", "Striker",
  "Mystic", "Warden", "Vector", "Primal", "Flux",
  "TalonX", "EmberZ", "Surge", "Shade", "Drift",
  "RazorX", "Helix", "Pulse", "AtlasX", "CruxX",
];

// Weighted towards EU — reflects real 4v4 population
const COUNTRIES = [
  "DE", "DE", "DE", "DE", "DE",
  "RU", "RU", "RU", "RU",
  "PL", "PL", "PL",
  "FR", "FR",
  "SE", "SE",
  "NL", "NL",
  "FI", "UA", "CZ", "GB", "GB", "ES", "IT", "RO", "AT", "DK", "NO", "BG", "HR", "HU", "SK", "BY",
  "US", "US", "US", "US",
  "CA", "CA",
  "BR", "BR",
  "AR",
  "KR", "KR", "KR",
  "CN", "CN",
  "AU", "TR", "IL", "MX", "CL",
];

const RACES = [1, 2, 4, 8]; // human, orc, nightelf, undead
const MAP_NAMES = ["(4)EkrezemsMaze", "(4)Snowblind", "(4)GoldRush", "(4)RoyalGardens", "(4)NerubianPassage"];

const randomNormal = (mean, std) => {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

const generatePool = (count) =>
  Array.from({ length: count }, (_, i) => {
    const name = i < NAMES.length ? NAMES[i] : `${NAMES[i % NAMES.length]}${Math.floor(i / NAMES.length)}`;
    const mmr = Math.round(Math.max(800, Math.min(2400, randomNormal(1500, 300))));
    const wins = Math.max(0, Math.round(randomNormal(50, 30)));
    const losses = Math.max(0, Math.round(randomNormal(45, 25)));
    return {
      battleTag: `${name}#${1000 + i}`,
      name,
      mmr,
      race: RACES[Math.floor(Math.random() * RACES.length)],
      country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      wins,
      losses,
    };
  });

/**
 * Fake data hook for demo mode (?demo in URL).
 * Returns the same shape as the real data sources in Home.jsx:
 *   { onlineUsers, matches, playerStats, playerProfiles, histogram }
 */
const useFakeData = (enabled) => {
  const [state, setState] = useState({
    onlineUsers: [],
    matches: [],
    playerStats: new Map(),
    playerProfiles: new Map(),
  });

  const histogram = useMemo(() => {
    if (!enabled) return null;
    const bins = [];
    for (let mmr = 800; mmr <= 2400; mmr += 50) {
      const count = Math.round(20 * Math.exp(-((mmr - 1500) ** 2) / (2 * 300 ** 2)));
      bins.push({ mmr: mmr + 25, count: Math.max(1, count) });
    }
    return bins;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const pool = generatePool(100);
    const online = new Set();
    const activeMatches = new Map();
    let nextMatchId = 0;

    const inMatchSet = () => {
      const s = new Set();
      for (const [, m] of activeMatches) m.indices.forEach((i) => s.add(i));
      return s;
    };

    const addPlayers = (count) => {
      const available = pool.map((_, i) => i).filter((i) => !online.has(i));
      const shuffled = available.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(count, shuffled.length); i++) online.add(shuffled[i]);
    };

    const removePlayers = (count) => {
      const inMatch = inMatchSet();
      const removable = [...online].filter((i) => !inMatch.has(i));
      const shuffled = removable.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(count, shuffled.length); i++) online.delete(shuffled[i]);
    };

    const startMatch = () => {
      const inMatch = inMatchSet();
      const available = [...online].filter((i) => !inMatch.has(i));
      if (available.length < 8) return;
      const picked = available.sort(() => Math.random() - 0.5).slice(0, 8);
      activeMatches.set(`fake-${nextMatchId++}`, {
        indices: picked,
        mapName: MAP_NAMES[Math.floor(Math.random() * MAP_NAMES.length)],
      });
    };

    const endMatch = () => {
      const ids = [...activeMatches.keys()];
      if (ids.length === 0) return;
      activeMatches.delete(ids[Math.floor(Math.random() * ids.length)]);
    };

    const flush = () => {
      const onlineUsers = [...online].map((i) => ({ battleTag: pool[i].battleTag }));
      const playerStats = new Map();
      const playerProfiles = new Map();

      for (const idx of online) {
        const p = pool[idx];
        playerStats.set(p.battleTag, { mmr: p.mmr, race: p.race, wins: p.wins, losses: p.losses, rank: null });
        playerProfiles.set(p.battleTag, p.country);
      }
      for (const [, m] of activeMatches) {
        for (const idx of m.indices) {
          const p = pool[idx];
          playerStats.set(p.battleTag, { mmr: p.mmr, race: p.race, wins: p.wins, losses: p.losses, rank: null });
          playerProfiles.set(p.battleTag, p.country);
        }
      }

      const matches = [...activeMatches.entries()].map(([id, m]) => ({
        id,
        mapName: m.mapName,
        teams: [
          { players: m.indices.slice(0, 4).map((i) => ({ battleTag: pool[i].battleTag, oldMmr: pool[i].mmr, currentMmr: pool[i].mmr, race: pool[i].race })) },
          { players: m.indices.slice(4, 8).map((i) => ({ battleTag: pool[i].battleTag, oldMmr: pool[i].mmr, currentMmr: pool[i].mmr, race: pool[i].race })) },
        ],
      }));

      setState({ onlineUsers, matches, playerStats, playerProfiles });
    };

    // Initial bulk: ~18 players + 1 match
    addPlayers(18);
    startMatch();
    flush();

    // Events every 3 seconds
    const interval = setInterval(() => {
      const r = Math.random();
      if (r < 0.25 && online.size < 50) {
        addPlayers(1 + Math.floor(Math.random() * 3));
      } else if (r < 0.40 && online.size > 8) {
        removePlayers(1 + Math.floor(Math.random() * 2));
      } else if (r < 0.55 && activeMatches.size < 3) {
        startMatch();
      } else if (r < 0.65 && activeMatches.size > 0) {
        endMatch();
      } else if (r < 0.80 && online.size < 50) {
        addPlayers(1);
      } else if (online.size > 10) {
        removePlayers(1);
      }
      flush();
    }, 3000);

    return () => clearInterval(interval);
  }, [enabled]);

  return {
    onlineUsers: state.onlineUsers,
    matches: state.matches,
    playerStats: state.playerStats,
    playerProfiles: state.playerProfiles,
    histogram,
  };
};

export default useFakeData;
