"""
Local nanoGPT training for WC3 player embeddings (MPS / CPU).

Usage:
  # First tokenize:
  python tokenizer.py --db ../data/chat.db --out ./data --min-replays 2

  # Then train:
  python train_local.py

  # With custom params:
  python train_local.py --n-layer 6 --max-iters 15000 --batch-size 64
"""

import argparse
import json
import time
import torch
import torch.nn as nn
from torch.nn import functional as F
import numpy as np
from pathlib import Path


# ── Model Definition (nanoGPT) ─────────────────────

class CausalSelfAttention(nn.Module):
    def __init__(self, n_embd, n_head, block_size, dropout):
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
        q, k, v = self.c_attn(x).split(self.n_embd, dim=2)
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
    def __init__(self, n_embd, dropout):
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
    def __init__(self, n_embd, n_head, block_size, dropout):
        super().__init__()
        self.ln_1 = nn.LayerNorm(n_embd)
        self.attn = CausalSelfAttention(n_embd, n_head, block_size, dropout)
        self.ln_2 = nn.LayerNorm(n_embd)
        self.mlp = MLP(n_embd, dropout)

    def forward(self, x):
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x


class GPT(nn.Module):
    def __init__(self, vocab_size, block_size, n_layer, n_head, n_embd, dropout):
        super().__init__()
        self.block_size = block_size
        self.transformer = nn.ModuleDict(dict(
            wte=nn.Embedding(vocab_size, n_embd),
            wpe=nn.Embedding(block_size, n_embd),
            drop=nn.Dropout(dropout),
            h=nn.ModuleList([Block(n_embd, n_head, block_size, dropout) for _ in range(n_layer)]),
            ln_f=nn.LayerNorm(n_embd),
        ))
        self.lm_head = nn.Linear(n_embd, vocab_size, bias=False)
        # Weight tying
        self.transformer.wte.weight = self.lm_head.weight
        self.apply(self._init_weights)

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
            mask = (idx != 0).unsqueeze(-1).float()
            masked = hidden * mask
            embedding = masked.sum(dim=1) / mask.sum(dim=1).clamp(min=1)
            return embedding


def get_lr(it, warmup_iters, max_iters, max_lr, min_lr):
    """Cosine learning rate schedule with warmup."""
    if it < warmup_iters:
        return max_lr * (it + 1) / warmup_iters
    if it >= max_iters:
        return min_lr
    decay_ratio = (it - warmup_iters) / (max_iters - warmup_iters)
    coeff = 0.5 * (1.0 + np.cos(np.pi * decay_ratio))
    return min_lr + coeff * (max_lr - min_lr)


def main():
    parser = argparse.ArgumentParser(description='Train nanoGPT locally')
    parser.add_argument('--data-dir', type=str, default='./data', help='Directory with train.bin/val.bin')
    parser.add_argument('--block-size', type=int, default=1024)
    parser.add_argument('--n-layer', type=int, default=6, help='Transformer layers (default: 6)')
    parser.add_argument('--n-head', type=int, default=4, help='Attention heads')
    parser.add_argument('--n-embd', type=int, default=128, help='Embedding dimension')
    parser.add_argument('--max-iters', type=int, default=15000, help='Training iterations')
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--learning-rate', type=float, default=3e-4)
    parser.add_argument('--dropout', type=float, default=0.1)
    parser.add_argument('--eval-interval', type=int, default=500)
    parser.add_argument('--warmup-iters', type=int, default=500)
    parser.add_argument('--eval-iters', type=int, default=20, help='Batches per eval (lower = faster evals)')
    parser.add_argument('--device', type=str, default='auto', help='Device: auto, mps, cuda, cpu')
    args = parser.parse_args()

    # Device selection
    if args.device == 'auto':
        if torch.cuda.is_available():
            device = 'cuda'
        elif torch.backends.mps.is_available():
            device = 'mps'
        else:
            device = 'cpu'
    else:
        device = args.device
    print(f'Using device: {device}')

    # Load data
    data_dir = Path(args.data_dir)
    train_data = np.fromfile(data_dir / 'train.bin', dtype=np.uint16)
    val_data = np.fromfile(data_dir / 'val.bin', dtype=np.uint16)
    with open(data_dir / 'meta.json') as f:
        meta = json.load(f)

    vocab_size = meta['vocab_size']
    print(f'Vocab size: {vocab_size}')
    print(f'Train tokens: {len(train_data):,}, Val tokens: {len(val_data):,}')

    train_data = torch.from_numpy(train_data.astype(np.int64))
    val_data = torch.from_numpy(val_data.astype(np.int64))

    def get_batch(split):
        data = train_data if split == 'train' else val_data
        ix = torch.randint(len(data) - args.block_size, (args.batch_size,))
        x = torch.stack([data[i:i + args.block_size] for i in ix])
        y = torch.stack([data[i + 1:i + args.block_size + 1] for i in ix])
        return x.to(device), y.to(device)

    # Build model
    model = GPT(
        vocab_size=vocab_size,
        block_size=args.block_size,
        n_layer=args.n_layer,
        n_head=args.n_head,
        n_embd=args.n_embd,
        dropout=args.dropout,
    ).to(device)

    n_params = sum(p.numel() for p in model.parameters())
    print(f'Model: {args.n_layer}L {args.n_head}H {args.n_embd}D — {n_params:,} parameters')

    tokens_per_iter = args.batch_size * args.block_size
    tokens_per_epoch = len(train_data)
    iters_per_epoch = tokens_per_epoch / tokens_per_iter
    total_epochs = args.max_iters / iters_per_epoch
    print(f'Batch: {args.batch_size} × {args.block_size} = {tokens_per_iter:,} tokens/iter')
    print(f'~{iters_per_epoch:.0f} iters/epoch, ~{total_epochs:.1f} total epochs over {args.max_iters} iters')

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.1)
    min_lr = args.learning_rate / 10

    @torch.no_grad()
    def estimate_loss(eval_iters=args.eval_iters):
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

    # Training loop
    print(f'\nTraining for {args.max_iters} iterations...\n')
    best_val_loss = float('inf')
    t0 = time.time()
    log_interval = 100

    model.train()
    for i in range(args.max_iters):
        # LR schedule
        lr = get_lr(i, args.warmup_iters, args.max_iters, args.learning_rate, min_lr)
        for pg in optimizer.param_groups:
            pg['lr'] = lr

        # Eval
        if i % args.eval_interval == 0:
            losses = estimate_loss()
            elapsed = time.time() - t0
            print(f'Step {i:>6d} | train {losses["train"]:.4f} | val {losses["val"]:.4f} | lr {lr:.2e} | {elapsed:.0f}s')
            if losses['val'] < best_val_loss:
                best_val_loss = losses['val']
                ckpt = {
                    'model': model.state_dict(),
                    'config': {
                        'vocab_size': vocab_size,
                        'block_size': args.block_size,
                        'n_layer': args.n_layer,
                        'n_head': args.n_head,
                        'n_embd': args.n_embd,
                    },
                    'val_loss': best_val_loss,
                    'iter': i,
                }
                torch.save(ckpt, data_dir / 'best_model.pt')
                print(f'  → Saved best model (val_loss={best_val_loss:.4f})')

        # Forward/backward
        x, y = get_batch('train')
        _, loss, _ = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        # Log
        if i % log_interval == 0 and i > 0 and i % args.eval_interval != 0:
            dt = time.time() - t0
            tokens_seen = i * tokens_per_iter
            print(f'Step {i:>6d} | loss {loss.item():.4f} | lr {lr:.2e} | {dt:.0f}s | {tokens_seen/1e6:.1f}M tokens')

    # Final eval
    losses = estimate_loss()
    elapsed = time.time() - t0
    print(f'\nStep {args.max_iters:>6d} | train {losses["train"]:.4f} | val {losses["val"]:.4f} | {elapsed:.0f}s')

    # Save final
    final_ckpt = {
        'model': model.state_dict(),
        'config': {
            'vocab_size': vocab_size,
            'block_size': args.block_size,
            'n_layer': args.n_layer,
            'n_head': args.n_head,
            'n_embd': args.n_embd,
        },
        'val_loss': losses['val'],
        'iter': args.max_iters,
    }
    torch.save(final_ckpt, data_dir / 'final_model.pt')

    print(f'\nTraining complete in {elapsed:.0f}s')
    print(f'Best val loss: {best_val_loss:.4f}')
    print(f'Saved: {data_dir}/best_model.pt, {data_dir}/final_model.pt')


if __name__ == '__main__':
    main()
