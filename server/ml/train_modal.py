"""
nanoGPT training on Modal for WC3 player embeddings.

This trains a small GPT model on tokenized action sequences to learn
player "style" embeddings. After training, we extract embeddings by
running sequences through the model and taking the mean hidden state.

Usage:
  # Local tokenize first:
  python tokenizer.py --db ../data/chat.db --out ./data

  # Then train on Modal:
  modal run train_modal.py

  # Or deploy as a persistent app:
  modal deploy train_modal.py

Requirements:
  pip install modal
  modal token new  # One-time auth
"""

import modal
import json
from pathlib import Path

# Modal app
app = modal.App("wc3-nanogpt")

# Docker image with PyTorch
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("torch>=2.0", "numpy>=1.24", "tqdm")
)

# Volume for persisting training data and checkpoints
vol = modal.Volume.from_name("wc3-nanogpt-data", create_if_missing=True)
VOLUME_PATH = "/data"


@app.function(
    image=image,
    gpu="T4",
    timeout=1800,  # 30 min max
    volumes={VOLUME_PATH: vol},
)
def train(
    block_size: int = 1024,
    n_layer: int = 4,
    n_head: int = 4,
    n_embd: int = 128,
    max_iters: int = 3000,
    eval_interval: int = 250,
    learning_rate: float = 3e-4,
    batch_size: int = 32,
    dropout: float = 0.1,
):
    """Train nanoGPT on WC3 action sequences."""
    import torch
    import torch.nn as nn
    from torch.nn import functional as F
    import numpy as np
    from tqdm import tqdm

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f'Using device: {device}')

    # Load data
    data_dir = Path(VOLUME_PATH)
    train_data = np.fromfile(data_dir / 'train.bin', dtype=np.uint16)
    val_data = np.fromfile(data_dir / 'val.bin', dtype=np.uint16)
    with open(data_dir / 'meta.json') as f:
        meta = json.load(f)

    vocab_size = meta['vocab_size']
    print(f'Vocab size: {vocab_size}')
    print(f'Train tokens: {len(train_data)}, Val tokens: {len(val_data)}')

    train_data = torch.from_numpy(train_data.astype(np.int64))
    val_data = torch.from_numpy(val_data.astype(np.int64))

    def get_batch(split):
        data = train_data if split == 'train' else val_data
        ix = torch.randint(len(data) - block_size, (batch_size,))
        x = torch.stack([data[i:i+block_size] for i in ix])
        y = torch.stack([data[i+1:i+block_size+1] for i in ix])
        return x.to(device), y.to(device)

    # ── Model Definition (nanoGPT) ─────────────────────

    class CausalSelfAttention(nn.Module):
        def __init__(self):
            super().__init__()
            self.c_attn = nn.Linear(n_embd, 3 * n_embd)
            self.c_proj = nn.Linear(n_embd, n_embd)
            self.attn_dropout = nn.Dropout(dropout)
            self.resid_dropout = nn.Dropout(dropout)
            self.n_head = n_head
            self.n_embd = n_embd
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
            self.dropout = nn.Dropout(dropout)

        def forward(self, x):
            x = self.c_fc(x)
            x = self.gelu(x)
            x = self.c_proj(x)
            x = self.dropout(x)
            return x

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
                drop=nn.Dropout(dropout),
                h=nn.ModuleList([Block() for _ in range(n_layer)]),
                ln_f=nn.LayerNorm(n_embd),
            ))
            self.lm_head = nn.Linear(n_embd, vocab_size, bias=False)
            # Weight tying
            self.transformer.wte.weight = self.lm_head.weight
            self.apply(self._init_weights)
            n_params = sum(p.numel() for p in self.parameters())
            print(f'Model parameters: {n_params:,}')

        def _init_weights(self, module):
            if isinstance(module, nn.Linear):
                torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
                if module.bias is not None:
                    torch.nn.init.zeros_(module.bias)
            elif isinstance(module, nn.Embedding):
                torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

        def forward(self, idx, targets=None):
            B, T = idx.size()
            pos = torch.arange(0, T, dtype=torch.long, device=idx.device)
            tok_emb = self.transformer.wte(idx)
            pos_emb = self.transformer.wpe(pos)
            x = self.transformer.drop(tok_emb + pos_emb)
            for block in self.transformer.h:
                x = block(x)
            x = self.transformer.ln_f(x)

            if targets is not None:
                logits = self.lm_head(x)
                loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1), ignore_index=0)
            else:
                logits = self.lm_head(x)
                loss = None
            return logits, loss, x  # x = hidden states for embedding

        def get_embedding(self, idx):
            """Get mean-pooled hidden state as embedding."""
            with torch.no_grad():
                _, _, hidden = self.forward(idx)
                # Mask padding tokens
                mask = (idx != 0).unsqueeze(-1).float()
                masked = hidden * mask
                embedding = masked.sum(dim=1) / mask.sum(dim=1).clamp(min=1)
                return embedding

    # ── Training Loop ──────────────────────────────────

    model = GPT().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

    @torch.no_grad()
    def estimate_loss(eval_iters=50):
        model.eval()
        losses = {}
        for split in ['train', 'val']:
            total = 0.0
            for _ in range(eval_iters):
                x, y = get_batch(split)
                _, loss, _ = model(x, y)
                total += loss.item()
            losses[split] = total / eval_iters
        model.train()
        return losses

    print(f'\nTraining config: {n_layer}L {n_head}H {n_embd}D, block_size={block_size}')
    print(f'Max iters: {max_iters}, batch_size: {batch_size}, lr: {learning_rate}')

    best_val_loss = float('inf')
    for i in tqdm(range(max_iters), desc='Training'):
        if i % eval_interval == 0:
            losses = estimate_loss()
            print(f'Step {i}: train loss {losses["train"]:.4f}, val loss {losses["val"]:.4f}')
            if losses['val'] < best_val_loss:
                best_val_loss = losses['val']
                ckpt = {
                    'model': model.state_dict(),
                    'config': {
                        'vocab_size': vocab_size,
                        'block_size': block_size,
                        'n_layer': n_layer,
                        'n_head': n_head,
                        'n_embd': n_embd,
                    },
                    'val_loss': best_val_loss,
                    'iter': i,
                }
                torch.save(ckpt, data_dir / 'best_model.pt')
                print(f'  → Saved best model (val_loss={best_val_loss:.4f})')

        x, y = get_batch('train')
        _, loss, _ = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

    # Final save
    final_ckpt = {
        'model': model.state_dict(),
        'config': {
            'vocab_size': vocab_size,
            'block_size': block_size,
            'n_layer': n_layer,
            'n_head': n_head,
            'n_embd': n_embd,
        },
        'val_loss': best_val_loss,
        'iter': max_iters,
    }
    torch.save(final_ckpt, data_dir / 'final_model.pt')
    vol.commit()

    print(f'\nTraining complete. Best val loss: {best_val_loss:.4f}')
    return {'best_val_loss': best_val_loss, 'total_iters': max_iters}


@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    volumes={VOLUME_PATH: vol},
)
def evaluate():
    """
    Evaluate trained model: compute pairwise embedding distances
    and check if same-player replays cluster together.
    """
    import torch
    import numpy as np
    import json

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    data_dir = Path(VOLUME_PATH)

    # Load model
    ckpt = torch.load(data_dir / 'best_model.pt', map_location=device, weights_only=False)
    config = ckpt['config']

    # Re-import model class (same as training)
    import torch.nn as nn
    from torch.nn import functional as F

    class CausalSelfAttention(nn.Module):
        def __init__(self):
            super().__init__()
            self.c_attn = nn.Linear(config['n_embd'], 3 * config['n_embd'])
            self.c_proj = nn.Linear(config['n_embd'], config['n_embd'])
            self.attn_dropout = nn.Dropout(0.0)
            self.resid_dropout = nn.Dropout(0.0)
            self.n_head = config['n_head']
            self.register_buffer("bias", torch.tril(torch.ones(config['block_size'], config['block_size'])).view(1, 1, config['block_size'], config['block_size']))

        def forward(self, x):
            B, T, C = x.size()
            q, k, v = self.c_attn(x).split(config['n_embd'], dim=2)
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
            self.c_fc = nn.Linear(config['n_embd'], 4 * config['n_embd'])
            self.gelu = nn.GELU()
            self.c_proj = nn.Linear(4 * config['n_embd'], config['n_embd'])
            self.dropout = nn.Dropout(0.0)

        def forward(self, x):
            return self.dropout(self.c_proj(self.gelu(self.c_fc(x))))

    class Block(nn.Module):
        def __init__(self):
            super().__init__()
            self.ln_1 = nn.LayerNorm(config['n_embd'])
            self.attn = CausalSelfAttention()
            self.ln_2 = nn.LayerNorm(config['n_embd'])
            self.mlp = MLP()

        def forward(self, x):
            x = x + self.attn(self.ln_1(x))
            x = x + self.mlp(self.ln_2(x))
            return x

    class GPT(nn.Module):
        def __init__(self):
            super().__init__()
            self.transformer = nn.ModuleDict(dict(
                wte=nn.Embedding(config['vocab_size'], config['n_embd']),
                wpe=nn.Embedding(config['block_size'], config['n_embd']),
                drop=nn.Dropout(0.0),
                h=nn.ModuleList([Block() for _ in range(config['n_layer'])]),
                ln_f=nn.LayerNorm(config['n_embd']),
            ))
            self.lm_head = nn.Linear(config['n_embd'], config['vocab_size'], bias=False)
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
    model.load_state_dict(ckpt['model'])
    model.eval()

    # Load player labels
    with open(data_dir / 'player_labels.json') as f:
        labels_data = json.load(f)

    player_counts = labels_data['player_counts']

    # Find players with 5+ replays for eval
    eval_players = [tag for tag, count in player_counts.items() if count >= 5]
    print(f'Eval players (5+ replays): {len(eval_players)}')

    if len(eval_players) < 2:
        print('Not enough players with 5+ replays for evaluation')
        return {'error': 'insufficient data'}

    # Load raw sequences from DB to tokenize
    # (We need the actual sequences, not the flattened train.bin)
    with open(data_dir / 'meta.json') as f:
        meta = json.load(f)

    # We need to re-tokenize from the source to get per-player sequences
    # For now, return instructions for manual eval
    result = {
        'eval_players': eval_players[:20],
        'player_counts': {p: player_counts[p] for p in eval_players[:20]},
        'model_val_loss': ckpt.get('val_loss', None),
        'model_iter': ckpt.get('iter', None),
        'instructions': (
            'To evaluate clustering, run eval_embeddings.py locally with the '
            'exported model and raw action sequences from the API.'
        ),
    }

    print(json.dumps(result, indent=2))
    vol.commit()
    return result


@app.local_entrypoint()
def main():
    """Upload data, train, then evaluate."""
    data_dir = Path(__file__).parent / 'data'

    if not (data_dir / 'train.bin').exists():
        print('ERROR: Run tokenizer.py first to generate train.bin/val.bin')
        print('  python tokenizer.py --db ../data/chat.db --out ./data')
        return

    # Upload data files to Modal volume
    print('Uploading training data to Modal...')
    with vol.batch_upload() as batch:
        batch.put_file(str(data_dir / 'train.bin'), 'train.bin')
        batch.put_file(str(data_dir / 'val.bin'), 'val.bin')
        batch.put_file(str(data_dir / 'meta.json'), 'meta.json')
        batch.put_file(str(data_dir / 'player_labels.json'), 'player_labels.json')
    print('Upload complete.')

    # Train
    result = train.remote()
    print(f'\nTraining result: {result}')

    # Evaluate
    eval_result = evaluate.remote()
    print(f'\nEvaluation result: {eval_result}')
