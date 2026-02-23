"""
Export trained nanoGPT model to ONNX for the inference sidecar.

The ONNX model takes input_ids (int64 [batch, block_size]) and outputs
128-dim mean-pooled embeddings (float32 [batch, n_embd]).

Usage:
  python export_onnx.py
  python export_onnx.py --model ./data/best_model.pt --out ./data/model.onnx
"""

import argparse
import torch
import torch.nn as nn
from torch.nn import functional as F
from pathlib import Path


class CausalSelfAttention(nn.Module):
    def __init__(self, n_embd, n_head, block_size):
        super().__init__()
        self.c_attn = nn.Linear(n_embd, 3 * n_embd)
        self.c_proj = nn.Linear(n_embd, n_embd)
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
        y = att @ v
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        y = self.c_proj(y)
        return y


class MLP(nn.Module):
    def __init__(self, n_embd):
        super().__init__()
        self.c_fc = nn.Linear(n_embd, 4 * n_embd)
        self.gelu = nn.GELU()
        self.c_proj = nn.Linear(4 * n_embd, n_embd)

    def forward(self, x):
        return self.c_proj(self.gelu(self.c_fc(x)))


class Block(nn.Module):
    def __init__(self, n_embd, n_head, block_size):
        super().__init__()
        self.ln_1 = nn.LayerNorm(n_embd)
        self.attn = CausalSelfAttention(n_embd, n_head, block_size)
        self.ln_2 = nn.LayerNorm(n_embd)
        self.mlp = MLP(n_embd)

    def forward(self, x):
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x


class GPTEmbedder(nn.Module):
    """GPT model that outputs mean-pooled embeddings (no lm_head)."""

    def __init__(self, vocab_size, block_size, n_layer, n_head, n_embd):
        super().__init__()
        self.wte = nn.Embedding(vocab_size, n_embd)
        self.wpe = nn.Embedding(block_size, n_embd)
        self.blocks = nn.ModuleList([Block(n_embd, n_head, block_size) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.block_size = block_size

    def forward(self, input_ids):
        B, T = input_ids.size()
        pos = torch.arange(0, T, dtype=torch.long, device=input_ids.device)
        x = self.wte(input_ids) + self.wpe(pos)
        for block in self.blocks:
            x = block(x)
        x = self.ln_f(x)
        # Mean-pool non-padding tokens (PAD=0)
        mask = (input_ids != 0).unsqueeze(-1).float()
        masked = x * mask
        embedding = masked.sum(dim=1) / mask.sum(dim=1).clamp(min=1)
        return embedding


def convert_state_dict(ckpt_state_dict):
    """Map training model state_dict keys to GPTEmbedder keys."""
    mapping = {}
    for k, v in ckpt_state_dict.items():
        new_k = k
        # transformer.wte.weight -> wte.weight
        new_k = new_k.replace('transformer.wte.', 'wte.')
        new_k = new_k.replace('transformer.wpe.', 'wpe.')
        new_k = new_k.replace('transformer.drop.', '')  # skip dropout
        new_k = new_k.replace('transformer.h.', 'blocks.')
        new_k = new_k.replace('transformer.ln_f.', 'ln_f.')

        # Skip lm_head (weight-tied with wte anyway) and dropout params
        if 'lm_head' in k:
            continue
        if 'drop' in new_k and 'dropout' not in new_k:
            continue
        # Skip dropout buffers/params
        if 'attn_dropout' in new_k or 'resid_dropout' in new_k:
            continue
        if new_k.endswith('.dropout.weight') or new_k.endswith('.dropout.bias'):
            continue

        mapping[new_k] = v
    return mapping


def main():
    parser = argparse.ArgumentParser(description='Export nanoGPT to ONNX')
    parser.add_argument('--model', type=str, default='./data/best_model.pt', help='Path to best_model.pt')
    parser.add_argument('--out', type=str, default='./data/model.onnx', help='Output ONNX path')
    args = parser.parse_args()

    print(f'Loading checkpoint: {args.model}')
    ckpt = torch.load(args.model, map_location='cpu', weights_only=False)
    config = ckpt['config']

    print(f'Config: {config}')
    print(f'Val loss: {ckpt.get("val_loss", "?")}')

    # Build embedder model
    embedder = GPTEmbedder(
        vocab_size=config['vocab_size'],
        block_size=config['block_size'],
        n_layer=config['n_layer'],
        n_head=config['n_head'],
        n_embd=config['n_embd'],
    )

    # Convert and load state dict
    new_sd = convert_state_dict(ckpt['model'])
    missing, unexpected = embedder.load_state_dict(new_sd, strict=False)
    if missing:
        print(f'Missing keys: {missing}')
    if unexpected:
        print(f'Unexpected keys: {unexpected}')

    embedder.eval()

    # Verify
    dummy = torch.randint(0, config['vocab_size'], (1, config['block_size']))
    with torch.no_grad():
        emb = embedder(dummy)
    print(f'Test embedding shape: {emb.shape} (expected [1, {config["n_embd"]}])')

    # Export to ONNX (use dynamo=False for compatibility with older onnxruntime)
    print(f'Exporting to ONNX: {args.out}')
    torch.onnx.export(
        embedder,
        dummy,
        args.out,
        input_names=['input_ids'],
        output_names=['output_embedding'],
        dynamic_axes={
            'input_ids': {0: 'batch_size'},
            'output_embedding': {0: 'batch_size'},
        },
        opset_version=14,
        dynamo=False,
    )

    import os
    size_mb = os.path.getsize(args.out) / (1024 * 1024)
    print(f'Exported: {args.out} ({size_mb:.1f} MB)')

    # Verify ONNX model
    try:
        import onnxruntime as ort
        import numpy as np
        session = ort.InferenceSession(args.out, providers=['CPUExecutionProvider'])
        input_ids = np.random.randint(0, config['vocab_size'], (2, config['block_size'])).astype(np.int64)
        result = session.run(None, {'input_ids': input_ids})
        print(f'ONNX verification: output shape {result[0].shape} — OK')
    except ImportError:
        print('onnxruntime not installed — skipping verification')


if __name__ == '__main__':
    main()
