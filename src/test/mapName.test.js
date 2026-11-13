import { describe, it, expect } from "vitest";
import { cleanMapName, mapKey, getMapImageUrl } from "../lib/formatters";

// Shapes the W3C stats endpoint actually sends (matches-on-map, Nov 2026)
describe("cleanMapName", () => {
  it.each([
    ["0w3c2606152308EkrezemsMazev1_1", "Ekrezems Maze"],
    ["2506221057BanditsRetreatv1_1", "Bandits Retreat"],
    ["DeadlockLVw3c260125135730", "Deadlock LV"],
    ["MountHyjalv1_25w3c26012513575149", "Mount Hyjal"],
    ["8w3c2609191153RuinsOfAlterac", "Ruins of Alterac"],
    ["w3c2606152308MurgulOasisLV", "Murgul Oasis LV"],
    ["2w3c2606152308BloodvenomFallsv2_1", "Bloodvenom Falls"],
    ["(4)Ekrezem's Maze", "Ekrezem's Maze"],
    [" Blouder Vale ATR", "Blouder Vale ATR"],
  ])("%s -> %s", (raw, name) => {
    expect(cleanMapName(raw)).toBe(name);
  });

  it("returns an empty string for missing input", () => {
    expect(cleanMapName(null)).toBe("");
    expect(cleanMapName(undefined)).toBe("");
  });
});

describe("mapKey", () => {
  it("matches one map across upload ids and the match endpoint's spelling", () => {
    expect(mapKey("4w3c2606152308EkrezemsMazev1_1")).toBe(mapKey("4w3c2609191153EkrezemsMazev1_1"));
    expect(mapKey("4w3c2606152308EkrezemsMazev1_1")).toBe(mapKey("(4)Ekrezem's Maze"));
  });
});

describe("getMapImageUrl", () => {
  it("resolves the cleaned name to the file in public/maps", () => {
    expect(getMapImageUrl(cleanMapName("8w3c2609191153RuinsOfAlterac"))).toBe("/maps/RuinsofAlterac.png");
    expect(getMapImageUrl(cleanMapName("0w3c2606152308EkrezemsMazev1_1"))).toBe("/maps/EkrezemsMaze.png");
  });
});
