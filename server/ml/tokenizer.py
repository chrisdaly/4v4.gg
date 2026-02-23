"""
WC3 Replay Action Sequence Tokenizer for nanoGPT

Exports action sequences from SQLite, converts to token IDs,
and outputs train.bin / val.bin (numpy memmap files).

Token schema:
  - 12 base action types × 7 time-delta buckets = 84 tokens
  - Hotkey assign: 10 groups × 7 buckets = 70 tokens
  - Hotkey select: 10 groups × 7 buckets = 70 tokens
  - 3 special tokens (PAD=0, BOS=1, EOS=2)
  Total vocab = 227

Usage:
  python tokenizer.py --db ../data/chat.db --out ./data
  python tokenizer.py --db ../data/chat.db --out ./data --block-size 1024
"""

import argparse
import json
import sqlite3
import numpy as np
from pathlib import Path
from collections import defaultdict

# ── Token Constants ─────────────────────────────────

PAD_TOKEN = 0
BOS_TOKEN = 1
EOS_TOKEN = 2
SPECIAL_TOKENS = 3

# Time delta buckets (ms since previous action)
# instant(<50), fast(50-150), medium(150-500), slow(500-1500), pause(1500-4000), long(4000-10000), afk(>10000)
TIME_BUCKET_BOUNDARIES = [50, 150, 500, 1500, 4000, 10000]
NUM_TIME_BUCKETS = 7

# Base action types (non-hotkey)
BASE_ACTION_IDS = [
    0x10,  # Ability (no target)
    0x11,  # Ability (target point)
    0x12,  # Ability (target unit)
    0x13,  # Ability (double target point)
    0x14,  # Ability (target pos + obj)
    0x16,  # Selection change
    0x19,  # Select subgroup (Tab)
    0x1E,  # Remove from build queue
    0x61,  # ESC pressed
    0x66,  # Hero skill menu
    0x67,  # Build menu
    0x68,  # Minimap ping
]
# Hotkey actions handled separately: 0x17 (assign), 0x18 (select)

NUM_BASE_ACTIONS = len(BASE_ACTION_IDS)  # 12
BASE_ACTION_INDEX = {aid: i for i, aid in enumerate(BASE_ACTION_IDS)}

# Token layout:
#   [0]       PAD
#   [1]       BOS
#   [2]       EOS
#   [3..86]   12 base actions × 7 buckets = 84 tokens
#   [87..156] 10 hotkey-assign groups × 7 buckets = 70 tokens
#   [157..226] 10 hotkey-select groups × 7 buckets = 70 tokens
#   Total = 227

BASE_OFFSET = SPECIAL_TOKENS                                    # 3
HOTKEY_ASSIGN_OFFSET = BASE_OFFSET + NUM_BASE_ACTIONS * NUM_TIME_BUCKETS  # 3 + 84 = 87
HOTKEY_SELECT_OFFSET = HOTKEY_ASSIGN_OFFSET + 10 * NUM_TIME_BUCKETS       # 87 + 70 = 157
VOCAB_SIZE = HOTKEY_SELECT_OFFSET + 10 * NUM_TIME_BUCKETS                 # 157 + 70 = 227


def time_bucket(delta_ms):
    """Map a time delta (ms) to a bucket index (0-6)."""
    for i, boundary in enumerate(TIME_BUCKET_BOUNDARIES):
        if delta_ms < boundary:
            return i
    return NUM_TIME_BUCKETS - 1


def tokenize_sequence(actions, block_size=1024):
    """
    Convert a list of action dicts [{ms, id, g?}, ...] to token IDs.
    Returns list of token IDs (length <= block_size, padded with BOS/EOS).
    """
    if not actions:
        return []

    tokens = [BOS_TOKEN]
    prev_ms = 0

    for action in actions:
        ms = action.get('ms', 0)
        aid = action.get('id', 0)
        delta = max(0, ms - prev_ms)
        prev_ms = ms
        bucket = time_bucket(delta)

        if aid == 0x17:  # Assign group hotkey
            group = action.get('g', 0)
            token = HOTKEY_ASSIGN_OFFSET + group * NUM_TIME_BUCKETS + bucket
        elif aid == 0x18:  # Select group hotkey
            group = action.get('g', 0)
            token = HOTKEY_SELECT_OFFSET + group * NUM_TIME_BUCKETS + bucket
        elif aid in BASE_ACTION_INDEX:
            idx = BASE_ACTION_INDEX[aid]
            token = BASE_OFFSET + idx * NUM_TIME_BUCKETS + bucket
        else:
            continue  # Skip unknown actions

        tokens.append(token)

        # Truncate to block_size - 1 to leave room for EOS
        if len(tokens) >= block_size - 1:
            break

    tokens.append(EOS_TOKEN)
    return tokens


def load_sequences_from_db(db_path):
    """Load action sequences from SQLite database.

    Uses COALESCE(battle_tag, player_name) for player identity so that
    bulk-imported replays (which lack battle_tag but have BNet names like
    "Nenzzz#21219") are still grouped by player.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT rpa.replay_id, rpa.player_id, rpa.full_action_sequence,
               COALESCE(rp.battle_tag, rp.player_name) as player_key,
               rp.player_name, rp.race
        FROM replay_player_actions rpa
        JOIN replay_players rp ON rp.replay_id = rpa.replay_id AND rp.player_id = rpa.player_id
        WHERE rpa.full_action_sequence IS NOT NULL
          AND length(rpa.full_action_sequence) > 2
        ORDER BY player_key, rpa.replay_id
    """)

    rows = cursor.fetchall()
    conn.close()

    sequences = []
    for row in rows:
        try:
            actions = json.loads(row['full_action_sequence'])
            if len(actions) < 10:  # Skip very short sequences
                continue
            sequences.append({
                'replay_id': row['replay_id'],
                'player_id': row['player_id'],
                'battle_tag': row['player_key'],
                'player_name': row['player_name'],
                'race': row['race'],
                'actions': actions,
            })
        except (json.JSONDecodeError, TypeError):
            continue

    return sequences


def load_sequences_from_json(json_path):
    """Load action sequences from a JSON export file."""
    with open(json_path) as f:
        data = json.load(f)

    sequences = []
    for item in data.get('sequences', data if isinstance(data, list) else []):
        actions = item.get('actions', [])
        if len(actions) < 10:
            continue
        sequences.append({
            'replay_id': item.get('replayId', item.get('replay_id', 0)),
            'player_id': item.get('playerId', item.get('player_id', 0)),
            'battle_tag': item.get('battleTag', item.get('battle_tag', '')),
            'player_name': item.get('playerName', item.get('player_name', '')),
            'race': item.get('race', ''),
            'actions': actions,
        })
    return sequences


def build_player_map(sequences):
    """Group sequences by battle_tag."""
    player_map = defaultdict(list)
    for seq in sequences:
        player_map[seq['battle_tag']].append(seq)
    return player_map


def tokenize_from_db_streaming(db_path, block_size, val_split, min_replays):
    """
    Stream-tokenize from SQLite without loading all JSON into memory.

    Pass 1: Build player counts and determine train/val split by player.
    Pass 2: Stream rows, tokenize, and accumulate token lists.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # ── Pass 1: Build player counts (lightweight — no action data) ──
    print('Pass 1: Building player counts...')
    cursor.execute("""
        SELECT COALESCE(rp.battle_tag, rp.player_name) as player_key,
               COUNT(*) as seq_count
        FROM replay_player_actions rpa
        JOIN replay_players rp ON rp.replay_id = rpa.replay_id AND rp.player_id = rpa.player_id
        WHERE rpa.full_action_sequence IS NOT NULL
          AND length(rpa.full_action_sequence) > 2
        GROUP BY player_key
    """)

    player_counts = {}
    for row in cursor.fetchall():
        player_counts[row[0]] = row[1]

    total_players = len(player_counts)
    print(f'  {total_players} unique players, {sum(player_counts.values())} total sequences')

    # Filter by min replays
    if min_replays > 1:
        player_counts = {k: v for k, v in player_counts.items() if v >= min_replays}
        print(f'  After filtering (min {min_replays}): {len(player_counts)} players, {sum(player_counts.values())} sequences')

    valid_players = set(player_counts.keys())

    # Determine train/val split by player
    player_list = sorted(player_counts.keys())
    rng = np.random.RandomState(42)
    rng.shuffle(player_list)
    val_count = max(1, int(len(player_list) * val_split))
    val_players = set(player_list[:val_count])

    print(f'  Split: {len(player_list) - val_count} train players, {val_count} val players')

    # ── Pass 2: Stream-tokenize ──
    print('Pass 2: Tokenizing sequences...')
    cursor.execute("""
        SELECT rpa.full_action_sequence,
               COALESCE(rp.battle_tag, rp.player_name) as player_key
        FROM replay_player_actions rpa
        JOIN replay_players rp ON rp.replay_id = rpa.replay_id AND rp.player_id = rpa.player_id
        WHERE rpa.full_action_sequence IS NOT NULL
          AND length(rpa.full_action_sequence) > 2
        ORDER BY player_key, rpa.replay_id
    """)

    train_tokens = []
    val_tokens = []
    player_labels = []  # For eval: which player each tokenized sequence belongs to
    total_actions = 0
    total_tok = 0
    n_seqs = 0
    n_skipped = 0

    batch_size = 500
    while True:
        rows = cursor.fetchmany(batch_size)
        if not rows:
            break

        for row in rows:
            player_key = row[1]
            if player_key not in valid_players:
                continue

            try:
                actions = json.loads(row[0])
            except (json.JSONDecodeError, TypeError):
                continue

            if len(actions) < 10:
                n_skipped += 1
                continue

            tokens = tokenize_sequence(actions, block_size=block_size)
            if len(tokens) < 5:
                n_skipped += 1
                continue

            total_actions += len(actions)
            total_tok += len(tokens)
            n_seqs += 1
            player_labels.append(player_key)

            if player_key in val_players:
                val_tokens.extend(tokens)
            else:
                train_tokens.extend(tokens)

            if n_seqs % 5000 == 0:
                print(f'  ... {n_seqs} sequences tokenized ({total_tok} tokens)')

    conn.close()

    avg_len = total_tok / max(n_seqs, 1)
    print(f'\nTokenization stats:')
    print(f'  Sequences: {n_seqs} (skipped {n_skipped})')
    print(f'  Total tokens: {total_tok}')
    print(f'  Avg sequence length: {avg_len:.1f}')
    print(f'  Vocab size: {VOCAB_SIZE}')
    print(f'  Unique players: {len(player_counts)}')

    train_seqs = sum(1 for p in player_labels if p not in val_players)
    val_seqs = sum(1 for p in player_labels if p in val_players)
    print(f'\nPlayer-based split:')
    print(f'  Train: {train_seqs} seqs ({len(train_tokens)} tokens) from {len(player_list) - val_count} players')
    print(f'  Val:   {val_seqs} seqs ({len(val_tokens)} tokens) from {val_count} players')

    return train_tokens, val_tokens, player_labels, player_counts


def main():
    parser = argparse.ArgumentParser(description='WC3 Action Sequence Tokenizer')
    parser.add_argument('--db', type=str, help='Path to SQLite database')
    parser.add_argument('--json', type=str, help='Path to JSON export file (alternative to --db)')
    parser.add_argument('--out', type=str, default='./data', help='Output directory')
    parser.add_argument('--block-size', type=int, default=1024, help='Max sequence length')
    parser.add_argument('--val-split', type=float, default=0.1, help='Validation split ratio')
    parser.add_argument('--min-replays', type=int, default=1, help='Min replays per player to include')
    args = parser.parse_args()

    if not args.db and not args.json:
        parser.error('Either --db or --json is required')

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.db:
        # Streaming mode for large databases — no OOM
        print(f'Loading from SQLite (streaming): {args.db}')
        train_tokens, val_tokens, player_labels, player_counts = tokenize_from_db_streaming(
            args.db, args.block_size, args.val_split, args.min_replays
        )
    else:
        # JSON mode (original in-memory approach — fine for smaller files)
        print(f'Loading from JSON: {args.json}')
        sequences = load_sequences_from_json(args.json)
        print(f'Loaded {len(sequences)} action sequences')

        player_map = build_player_map(sequences)
        if args.min_replays > 1:
            filtered = []
            for tag, seqs in player_map.items():
                if len(seqs) >= args.min_replays:
                    filtered.extend(seqs)
            sequences = filtered
            player_map = build_player_map(sequences)
            print(f'After filtering (min {args.min_replays} replays): {len(sequences)} sequences from {len(player_map)} players')

        if not sequences:
            print('No sequences to process!')
            return

        all_tokens = []
        player_labels = []
        for seq in sequences:
            tokens = tokenize_sequence(seq['actions'], block_size=args.block_size)
            if len(tokens) < 5:
                continue
            all_tokens.append(tokens)
            player_labels.append(seq['battle_tag'])

        # Player-based split
        unique_players = list(set(player_labels))
        rng = np.random.RandomState(42)
        rng.shuffle(unique_players)
        val_count = max(1, int(len(unique_players) * args.val_split))
        val_players = set(unique_players[:val_count])

        train_tokens = []
        val_tokens = []
        for i, tokens in enumerate(all_tokens):
            if player_labels[i] in val_players:
                val_tokens.extend(tokens)
            else:
                train_tokens.extend(tokens)

        player_counts = {tag: len(seqs) for tag, seqs in player_map.items()}

    if not train_tokens:
        print('No training data!')
        return

    # Save as numpy memmap files (uint16)
    train_arr = np.array(train_tokens, dtype=np.uint16)
    val_arr = np.array(val_tokens, dtype=np.uint16)

    train_arr.tofile(out_dir / 'train.bin')
    val_arr.tofile(out_dir / 'val.bin')

    # Save metadata
    meta = {
        'vocab_size': VOCAB_SIZE,
        'block_size': args.block_size,
        'train_tokens': len(train_tokens),
        'val_tokens': len(val_tokens),
        'num_sequences': len(player_labels),
        'num_players': len(set(player_labels)),
        'token_layout': {
            'PAD': PAD_TOKEN,
            'BOS': BOS_TOKEN,
            'EOS': EOS_TOKEN,
            'base_offset': BASE_OFFSET,
            'base_actions': NUM_BASE_ACTIONS,
            'hotkey_assign_offset': HOTKEY_ASSIGN_OFFSET,
            'hotkey_select_offset': HOTKEY_SELECT_OFFSET,
            'num_time_buckets': NUM_TIME_BUCKETS,
        },
    }
    with open(out_dir / 'meta.json', 'w') as f:
        json.dump(meta, f, indent=2)

    # Save player labels for eval
    labels_data = {
        'player_labels': player_labels,
        'player_counts': player_counts,
    }
    with open(out_dir / 'player_labels.json', 'w') as f:
        json.dump(labels_data, f, indent=2)

    print(f'\nSaved to {out_dir}:')
    print(f'  train.bin ({train_arr.nbytes / 1024:.1f} KB)')
    print(f'  val.bin ({val_arr.nbytes / 1024:.1f} KB)')
    print(f'  meta.json')
    print(f'  player_labels.json')


if __name__ == '__main__':
    main()
