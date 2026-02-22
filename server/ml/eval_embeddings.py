"""
Evaluate nanoGPT embeddings: pairwise distances + t-SNE visualization.

Loads the trained model, computes embeddings for all player sequences,
and checks whether same-player replays cluster together.

Usage:
  # After training (download best_model.pt from Modal volume):
  modal volume get wc3-nanogpt-data best_model.pt ./data/best_model.pt

  # Run eval:
  python eval_embeddings.py --model ./data/best_model.pt --db ../data/chat.db

  # Or with JSON export:
  python eval_embeddings.py --model ./data/best_model.pt --json ./data/sequences.json

Requirements:
  pip install torch numpy scikit-learn matplotlib
"""

import argparse
import json
import numpy as np
import torch
import torch.nn as nn
from torch.nn import functional as F
from pathlib import Path
from collections import defaultdict

from tokenizer import tokenize_sequence, VOCAB_SIZE, PAD_TOKEN


def build_model(config, device):
    """Rebuild the GPT model from config."""
    n_embd = config['n_embd']
    n_head = config['n_head']
    n_layer = config['n_layer']
    block_size = config['block_size']
    vocab_size = config['vocab_size']

    class CausalSelfAttention(nn.Module):
        def __init__(self):
            super().__init__()
            self.c_attn = nn.Linear(n_embd, 3 * n_embd)
            self.c_proj = nn.Linear(n_embd, n_embd)
            self.attn_dropout = nn.Dropout(0.0)
            self.resid_dropout = nn.Dropout(0.0)
            self.n_head = n_head
            self.register_buffer("bias", torch.tril(torch.ones(block_size, block_size)).view(1, 1, block_size, block_size))

        def forward(self, x):
            B, T, C = x.size()
            q, k, v = self.c_attn(x).split(n_embd, dim=2)
            k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
            q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
            v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
            att = (q @ k.transpose(-2, -1)) * (1.0 / (k.size(-1) ** 0.5))
            att = att.masked_fill(self.bias[:, :, :T, :T] == 0, float('-inf'))
            att = F.softmax(att, dim=-1)
            att = self.attn_dropout(att)
            y = att @ v
            y = y.transpose(1, 2).contiguous().view(B, T, C)
            y = self.resid_dropout(self.c_proj(y))
            return y

    class MLP(nn.Module):
        def __init__(self):
            super().__init__()
            self.c_fc = nn.Linear(n_embd, 4 * n_embd)
            self.gelu = nn.GELU()
            self.c_proj = nn.Linear(4 * n_embd, n_embd)
            self.dropout = nn.Dropout(0.0)

        def forward(self, x):
            return self.dropout(self.c_proj(self.gelu(self.c_fc(x))))

    class Block(nn.Module):
        def __init__(self):
            super().__init__()
            self.ln_1 = nn.LayerNorm(n_embd)
            self.attn = CausalSelfAttention()
            self.ln_2 = nn.LayerNorm(n_embd)
            self.mlp = MLP()

        def forward(self, x):
            x = x + self.attn(self.ln_1(x))
            x = x + self.mlp(self.ln_2(x))
            return x

    class GPT(nn.Module):
        def __init__(self):
            super().__init__()
            self.transformer = nn.ModuleDict(dict(
                wte=nn.Embedding(vocab_size, n_embd),
                wpe=nn.Embedding(block_size, n_embd),
                drop=nn.Dropout(0.0),
                h=nn.ModuleList([Block() for _ in range(n_layer)]),
                ln_f=nn.LayerNorm(n_embd),
            ))
            self.lm_head = nn.Linear(n_embd, vocab_size, bias=False)
            self.transformer.wte.weight = self.lm_head.weight

        def get_embedding(self, idx):
            B, T = idx.size()
            pos = torch.arange(0, T, dtype=torch.long, device=idx.device)
            x = self.transformer.drop(self.transformer.wte(idx) + self.transformer.wpe(pos))
            for block in self.transformer.h:
                x = block(x)
            x = self.transformer.ln_f(x)
            mask = (idx != 0).unsqueeze(-1).float()
            masked = x * mask
            return (masked.sum(dim=1) / mask.sum(dim=1).clamp(min=1))

    model = GPT().to(device)
    return model


def compute_embeddings(model, sequences, block_size, device):
    """Compute embeddings for all sequences."""
    embeddings = []
    labels = []

    model.eval()
    with torch.no_grad():
        for seq in sequences:
            tokens = tokenize_sequence(seq['actions'], block_size=block_size)
            if len(tokens) < 5:
                continue

            # Pad to block_size
            padded = tokens + [PAD_TOKEN] * (block_size - len(tokens))
            padded = padded[:block_size]

            x = torch.tensor([padded], dtype=torch.long, device=device)
            emb = model.get_embedding(x)
            embeddings.append(emb.cpu().numpy()[0])
            labels.append(seq['battle_tag'])

    return np.array(embeddings), labels


def main():
    parser = argparse.ArgumentParser(description='Evaluate nanoGPT player embeddings')
    parser.add_argument('--model', type=str, required=True, help='Path to best_model.pt')
    parser.add_argument('--db', type=str, help='Path to SQLite database')
    parser.add_argument('--json', type=str, help='Path to JSON sequences file')
    parser.add_argument('--min-replays', type=int, default=5, help='Min replays for eval players')
    parser.add_argument('--top-n', type=int, default=10, help='Number of players to visualize')
    parser.add_argument('--out', type=str, default='./eval_results', help='Output directory')
    args = parser.parse_args()

    if not args.db and not args.json:
        parser.error('Either --db or --json is required')

    device = 'cpu'  # Eval on CPU is fine

    # Load model
    print(f'Loading model from {args.model}')
    ckpt = torch.load(args.model, map_location=device, weights_only=False)
    config = ckpt['config']
    model = build_model(config, device)
    model.load_state_dict(ckpt['model'])
    print(f'Model loaded (val_loss={ckpt.get("val_loss", "?")})')

    # Load sequences
    if args.db:
        from tokenizer import load_sequences_from_db
        sequences = load_sequences_from_db(args.db)
    else:
        from tokenizer import load_sequences_from_json
        sequences = load_sequences_from_json(args.json)

    print(f'Loaded {len(sequences)} sequences')

    # Filter to players with enough replays
    player_map = defaultdict(list)
    for seq in sequences:
        player_map[seq['battle_tag']].append(seq)

    eval_players = [tag for tag, seqs in player_map.items() if len(seqs) >= args.min_replays]
    eval_players.sort(key=lambda t: len(player_map[t]), reverse=True)
    eval_players = eval_players[:args.top_n]

    eval_sequences = []
    for tag in eval_players:
        eval_sequences.extend(player_map[tag])

    print(f'Eval: {len(eval_sequences)} sequences from {len(eval_players)} players')

    # Compute embeddings
    embeddings, labels = compute_embeddings(model, eval_sequences, config['block_size'], device)
    print(f'Computed {len(embeddings)} embeddings ({config["n_embd"]}-dim)')

    # ── Pairwise Distance Analysis ─────────────────────

    from sklearn.metrics.pairwise import cosine_distances

    dist_matrix = cosine_distances(embeddings)

    # Compute intra-player vs inter-player distances
    intra_dists = []
    inter_dists = []

    for i in range(len(labels)):
        for j in range(i + 1, len(labels)):
            d = dist_matrix[i, j]
            if labels[i] == labels[j]:
                intra_dists.append(d)
            else:
                inter_dists.append(d)

    intra_mean = np.mean(intra_dists) if intra_dists else 0
    inter_mean = np.mean(inter_dists) if inter_dists else 0
    separation = inter_mean / max(intra_mean, 1e-8)

    print(f'\nClustering Analysis:')
    print(f'  Intra-player distance (lower=better): {intra_mean:.4f}')
    print(f'  Inter-player distance (higher=better): {inter_mean:.4f}')
    print(f'  Separation ratio (higher=better): {separation:.2f}')
    print(f'  Verdict: {"CLUSTERING DETECTED" if separation > 1.5 else "WEAK/NO CLUSTERING"}')

    # ── t-SNE Visualization ────────────────────────────

    try:
        from sklearn.manifold import TSNE
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        print('\nGenerating t-SNE plot...')
        tsne = TSNE(n_components=2, perplexity=min(30, len(embeddings) - 1), random_state=42)
        coords = tsne.fit_transform(embeddings)

        out_dir = Path(args.out)
        out_dir.mkdir(parents=True, exist_ok=True)

        # Assign colors to players
        unique_players = list(set(labels))
        colors = plt.cm.tab20(np.linspace(0, 1, len(unique_players)))
        player_colors = {p: colors[i] for i, p in enumerate(unique_players)}

        fig, ax = plt.subplots(1, 1, figsize=(12, 8))
        for tag in unique_players:
            mask = [i for i, l in enumerate(labels) if l == tag]
            short_name = tag.split('#')[0]
            ax.scatter(coords[mask, 0], coords[mask, 1],
                       c=[player_colors[tag]], label=f'{short_name} ({len(mask)})',
                       s=60, alpha=0.7, edgecolors='white', linewidth=0.5)

        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=8)
        ax.set_title(f'WC3 Player Embeddings (t-SNE)\n'
                     f'Intra={intra_mean:.3f} Inter={inter_mean:.3f} Ratio={separation:.1f}')
        ax.set_xlabel('t-SNE 1')
        ax.set_ylabel('t-SNE 2')
        plt.tight_layout()
        plt.savefig(out_dir / 'tsne_clusters.png', dpi=150)
        print(f'  Saved: {out_dir / "tsne_clusters.png"}')

    except ImportError as e:
        print(f'\nSkipping t-SNE plot (missing dependency: {e})')
        print('  pip install scikit-learn matplotlib')

    # Save results
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    results = {
        'intra_player_distance': float(intra_mean),
        'inter_player_distance': float(inter_mean),
        'separation_ratio': float(separation),
        'clustering_detected': bool(separation > 1.5),
        'num_players': len(eval_players),
        'num_sequences': len(embeddings),
        'players': {tag: len(player_map[tag]) for tag in eval_players},
    }
    with open(out_dir / 'eval_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print(f'  Saved: {out_dir / "eval_results.json"}')


if __name__ == '__main__':
    main()
