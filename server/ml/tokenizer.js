/**
 * JS port of the Python tokenizer for server-side use.
 * Converts action sequences to token IDs for the nanoGPT inference sidecar.
 */

export const PAD_TOKEN = 0;
export const BOS_TOKEN = 1;
export const EOS_TOKEN = 2;
const SPECIAL_TOKENS = 3;

// Time delta bucket boundaries (ms)
const TIME_BUCKET_BOUNDARIES = [50, 150, 500, 1500, 4000, 10000];
const NUM_TIME_BUCKETS = 7;

// Base action IDs (same order as Python tokenizer)
const BASE_ACTION_IDS = [
  0x10, 0x11, 0x12, 0x13, 0x14,
  0x16, 0x19, 0x1E, 0x61, 0x66, 0x67, 0x68,
];
const NUM_BASE_ACTIONS = BASE_ACTION_IDS.length; // 12
const BASE_ACTION_INDEX = new Map(BASE_ACTION_IDS.map((id, i) => [id, i]));

const BASE_OFFSET = SPECIAL_TOKENS;
const HOTKEY_ASSIGN_OFFSET = BASE_OFFSET + NUM_BASE_ACTIONS * NUM_TIME_BUCKETS;
const HOTKEY_SELECT_OFFSET = HOTKEY_ASSIGN_OFFSET + 10 * NUM_TIME_BUCKETS;
export const VOCAB_SIZE = HOTKEY_SELECT_OFFSET + 10 * NUM_TIME_BUCKETS; // 227

function timeBucket(deltaMs) {
  for (let i = 0; i < TIME_BUCKET_BOUNDARIES.length; i++) {
    if (deltaMs < TIME_BUCKET_BOUNDARIES[i]) return i;
  }
  return NUM_TIME_BUCKETS - 1;
}

/**
 * Tokenize an action sequence [{ms, id, g?}, ...] into token IDs.
 * @param {Array} actions - Raw action sequence from replay parser
 * @param {number} blockSize - Max sequence length (default 1024)
 * @returns {number[]} Token IDs
 */
export function tokenize(actions, blockSize = 1024) {
  if (!actions || actions.length === 0) return [];

  const tokens = [BOS_TOKEN];
  let prevMs = 0;

  for (const action of actions) {
    const ms = action.ms || 0;
    const aid = action.id || 0;
    const delta = Math.max(0, ms - prevMs);
    prevMs = ms;
    const bucket = timeBucket(delta);

    let token;
    if (aid === 0x17) {
      const group = action.g || 0;
      token = HOTKEY_ASSIGN_OFFSET + group * NUM_TIME_BUCKETS + bucket;
    } else if (aid === 0x18) {
      const group = action.g || 0;
      token = HOTKEY_SELECT_OFFSET + group * NUM_TIME_BUCKETS + bucket;
    } else if (BASE_ACTION_INDEX.has(aid)) {
      const idx = BASE_ACTION_INDEX.get(aid);
      token = BASE_OFFSET + idx * NUM_TIME_BUCKETS + bucket;
    } else {
      continue;
    }

    tokens.push(token);
    if (tokens.length >= blockSize - 1) break;
  }

  tokens.push(EOS_TOKEN);
  return tokens;
}
