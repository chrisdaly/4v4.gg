/**
 * Viz Registry — Central registry of all signature visualizations.
 * Each entry defines: id, name, category, lazy component, description.
 */
import { lazy } from "react";

// ── Categories ─────────────────────────────────────────

export const VIZ_CATEGORIES = [
  { id: "music", label: "Music" },
  { id: "biology", label: "Biology" },
  { id: "maps", label: "Maps" },
  { id: "engineering", label: "Engineering" },
  { id: "sports", label: "Sports" },
  { id: "dataart", label: "Data Art" },
  { id: "abstract", label: "Abstract" },
];

// ── Registry ───────────────────────────────────────────

export const VIZ_REGISTRY = [
  // Music
  {
    id: "piano-roll",
    name: "Piano Roll",
    category: "music",
    component: lazy(() => import("./music/PianoRoll")),
    desc: "MIDI grid: hotkey groups x tempo bins",
  },
  {
    id: "sheet-music",
    name: "Sheet Music",
    category: "music",
    component: lazy(() => import("./music/SheetMusic")),
    desc: "5-line staff with notes per action type",
  },
  {
    id: "guitar-tab",
    name: "Guitar Tab",
    category: "music",
    component: lazy(() => import("./music/GuitarTab")),
    desc: "6 strings = action types, fret numbers from hotkeys",
  },
  {
    id: "vinyl-groove",
    name: "Vinyl Groove",
    category: "music",
    component: lazy(() => import("./music/VinylGroove")),
    desc: "Spiral groove modulated by tempo and rhythm",
  },
  {
    id: "equalizer",
    name: "Equalizer",
    category: "music",
    component: lazy(() => import("./music/Equalizer")),
    desc: "EQ bars for tempo bins + VU meter for APM",
  },

  // Biology
  {
    id: "dna-helix",
    name: "DNA Helix",
    category: "biology",
    component: lazy(() => import("./biology/DnaHelix")),
    desc: "Double helix: select/assign strands, rungs = transitions",
  },
  {
    id: "chromosome",
    name: "Chromosome",
    category: "biology",
    component: lazy(() => import("./biology/ChromosomeBanding")),
    desc: "Banded bar showing all 63 dimensions",
  },
  {
    id: "tree-rings",
    name: "Tree Rings",
    category: "biology",
    component: lazy(() => import("./biology/TreeRings")),
    desc: "Concentric rings per segment, cracks from transitions",
  },
  {
    id: "fingerprint",
    name: "Fingerprint",
    category: "biology",
    component: lazy(() => import("./biology/FingerprintRidges")),
    desc: "Loop/whorl/arch ridges modulated by action data",
  },
  {
    id: "heartbeat",
    name: "Heartbeat ECG",
    category: "biology",
    component: lazy(() => import("./biology/HeartbeatEcg")),
    desc: "ECG trace with one complex per action type",
  },

  // Maps
  {
    id: "subway-map",
    name: "Subway Map",
    category: "maps",
    component: lazy(() => import("./maps/SubwayMap")),
    desc: "Transit lines = transitions, stations = hotkey groups",
  },
  {
    id: "constellation",
    name: "Constellation",
    category: "maps",
    component: lazy(() => import("./maps/ConstellationMap")),
    desc: "Stars = hotkey groups, lines = transitions, nebula = embedding",
  },
  {
    id: "topo-contour",
    name: "Topo Contour",
    category: "maps",
    component: lazy(() => import("./maps/TopoContour")),
    desc: "8x8 heightmap from embedding with contour lines",
  },

  // Engineering
  {
    id: "gauge-cluster",
    name: "Gauge Cluster",
    category: "engineering",
    component: lazy(() => import("./engineering/GaugeCluster")),
    desc: "Dashboard gauges for APM, intensity, tempo",
  },
  {
    id: "circuit-board",
    name: "Circuit Board",
    category: "engineering",
    component: lazy(() => import("./engineering/CircuitBoard")),
    desc: "PCB traces connecting action type chips",
  },

  // Sports
  {
    id: "soccer-formation",
    name: "Formation",
    category: "sports",
    component: lazy(() => import("./sports/SoccerFormation")),
    desc: "Hotkey groups as players on a pitch",
  },
  {
    id: "playbook-routes",
    name: "Playbook Routes",
    category: "sports",
    component: lazy(() => import("./sports/PlaybookRoutes")),
    desc: "X's and O's with route lines from rhythm trigrams",
  },

  // Data Art
  {
    id: "barcode",
    name: "Barcode",
    category: "dataart",
    component: lazy(() => import("./dataart/Barcode")),
    desc: "All 63 dimensions as colored vertical bars",
  },
  {
    id: "flame-graph",
    name: "Flame Graph",
    category: "dataart",
    component: lazy(() => import("./dataart/FlameGraph")),
    desc: "Hierarchical: actions > hotkey groups > transitions",
  },
  {
    id: "chord-diagram",
    name: "Chord Diagram",
    category: "dataart",
    component: lazy(() => import("./dataart/ChordDiagram")),
    desc: "Circular arcs + ribbons for group transitions",
  },

  // Abstract
  {
    id: "geometric-tattoo",
    name: "Geometric Tattoo",
    category: "abstract",
    component: lazy(() => import("./abstract/GeometricTattoo")),
    desc: "Sacred geometry: hexagon core + radial lines + petals",
  },
  {
    id: "sigil",
    name: "Sigil",
    category: "abstract",
    component: lazy(() => import("./abstract/Sigil")),
    desc: "Rune/glyph: spine + crossbars + diagonal strokes",
  },
];

// ── Helpers ────────────────────────────────────────────

/** Get all vizzes for a category */
export function getVizzesByCategory(categoryId) {
  return VIZ_REGISTRY.filter((v) => v.category === categoryId);
}

/** Get a single viz by id */
export function getVizById(id) {
  return VIZ_REGISTRY.find((v) => v.id === id);
}
