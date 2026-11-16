/**
 * Control-group switches in one replay: how often a player jumps from group A
 * to group B ("1->2": 37). The playstyle glyph draws these as arcs.
 *
 * Worked out once per replay and stored in replay_player_actions.group_transitions,
 * so the gallery and Identify never re-read click sequences (hundreds of KB
 * each; reading them for every player kept the gallery build from finishing).
 *
 * Same rule the glyph always used: the first 1,000 actions of the sequence,
 * skipping the first two minutes (openings are scripted), counting a switch
 * when a group-select hotkey names a different group than the last one.
 */

export const TRANSITION_ACTION_CAP = 1000;
const OPENING_MS = 120000;

/**
 * @param {Array<{id: number, g?: number, ms: number}>|null} seq
 * @returns {Record<string, number>}
 */
export function groupTransitionCounts(seq) {
  const out = {};
  if (!Array.isArray(seq)) return out;
  let last = null;
  const cap = Math.min(seq.length, TRANSITION_ACTION_CAP);
  for (let i = 0; i < cap; i++) {
    const a = seq[i];
    if (!a || a.ms < OPENING_MS) continue;
    const isHotkey = (a.id === 0x17 || a.id === 0x18) && a.g != null;
    if (!isHotkey) continue;
    if (last !== null && last !== a.g) {
      const key = `${last}->${a.g}`;
      out[key] = (out[key] || 0) + 1;
    }
    last = a.g;
  }
  return out;
}
