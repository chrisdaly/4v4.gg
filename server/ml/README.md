# WC3 Smurf Detector — nanoGPT Embeddings

Train a tiny GPT model on WC3 replay action sequences to learn player "style" embeddings.

## Pipeline

```
1. Batch import replays → server has 1000+ replays in SQLite
2. Backfill action sequences → full_action_sequence column populated
3. Tokenize → train.bin / val.bin
4. Train on Modal → best_model.pt
5. Evaluate → t-SNE plot, clustering metrics
```

## Quick Start

```bash
# 1. Import replays (from server root)
curl -X POST http://localhost:3002/api/replays/batch-import \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# 2. Backfill action sequences
curl -X POST http://localhost:3002/api/replays/backfill-actions \
  -H "X-API-Key: $ADMIN_API_KEY"

# 3. Tokenize (from ml/ directory)
python tokenizer.py --db ../data/chat.db --out ./data

# 4. Train on Modal
modal run train_modal.py

# 5. Download model and evaluate
modal volume get wc3-nanogpt-data best_model.pt ./data/best_model.pt
python eval_embeddings.py --model ./data/best_model.pt --db ../data/chat.db
```

## Token Schema

| Range | Count | Description |
|-------|-------|-------------|
| 0 | 1 | PAD |
| 1 | 1 | BOS (start of sequence) |
| 2 | 1 | EOS (end of sequence) |
| 3–86 | 84 | 12 base actions × 7 time buckets |
| 87–156 | 70 | 10 hotkey-assign groups × 7 time buckets |
| 157–226 | 70 | 10 hotkey-select groups × 7 time buckets |
| **Total** | **227** | |

Time buckets: instant (<50ms), fast (50-150), medium (150-500), slow (500-1500), pause (1500-4000), long (4000-10000), afk (>10000)

## Model Config

- **Layers:** 4, **Heads:** 4, **Embedding dim:** 128
- **Parameters:** ~1M
- **Block size:** 1024 tokens
- **Training:** ~5-15 min on T4 GPU ($0.15-0.30 on Modal)

## Evaluation

The eval script computes:
- **Intra-player distance**: Average cosine distance between same-player replays (lower = better)
- **Inter-player distance**: Average cosine distance between different-player replays (higher = better)
- **Separation ratio**: inter/intra (>1.5 indicates meaningful clustering)
- **t-SNE plot**: Visual clustering of player embeddings
