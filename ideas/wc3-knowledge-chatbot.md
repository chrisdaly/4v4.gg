# WC3 Knowledge Chatbot

A RAG-powered chatbot that answers Warcraft III gameplay questions using community knowledge. Lives as a Discord bot where the WC3 community already is.

**Example query:** "Does anti magic shield protect against bats?"
→ Bot retrieves relevant patch notes, wiki data, and community discussions, then generates a sourced answer reflecting the current patch.

## Core Challenge

Date/patch awareness. New patches override old info, so every document needs temporal metadata:
```python
{
    "content": "Anti Magic Shell now costs 50 mana (was 75)",
    "patch_version": "1.36.2",
    "patch_date": "2025-08-15",
    "is_current": True,  # flipped to False when superseded
    "source": "patch_notes"
}
```
Queries default to `is_current=True`. Historical queries ("when did this change?") search the full timeline.

## Data Sources

### Tier 1 - Easy access, high value
- **Liquipedia** - API (60 req/hr). Patch notes, unit stats, strategies, tournament data. Best single source.
- **classic.battle.net** - Official unit stats pages, scrapable HTML
- **GitHub CSV** - Community unit stats spreadsheet: https://gist.github.com/NobleUplift/3b64dc4690b7b04bf07b
- **Blizzard News** - Official patch notes (1.36+, 2.0+)

### Tier 2 - Moderate effort, rich content
- **Reddit** (r/wc3) - Free API tier at 100 req/min. Strategy discussions, meta analysis
- **WC3 Gym website** (warcraft-gym.com) - Structured build orders, creep routes, mechanics guides
- **unitstatistics.com** - Damage calc tables, armor type matrices

### Tier 3 - High value but needs permission
- **Discord** (W3Champions, WC3 Gym, B2W) - Need server admin permission to deploy a bot/archiver
  - Tools: discord-channel-archiver (GitHub), Xenon Bot
  - Can export to JSON/CSV

## Recommended Architecture

| Component | MVP (Week 1-3) | Production (Month 2+) |
|-----------|----------------|----------------------|
| Vector DB | Chroma (embedded, zero setup) | Qdrant (self-hosted) |
| Embeddings | OpenAI text-embedding-3-small | Nomic Embed v2 (free, local) |
| LLM | Claude Sonnet 4.5 | Claude Sonnet 4.5 (with prompt caching) |
| Framework | LlamaIndex | LlamaIndex + LangChain |
| Search | Vector only | Hybrid BM25 + vector (42% accuracy boost) |
| Deploy | Railway.app ($5-10/mo) | Docker on VPS ($12/mo) |

## Cost Estimate (production, 10K queries/month)

| Item | Cost |
|------|------|
| VPS (Qdrant + embeddings) | $12/mo |
| Claude API (with prompt caching = ~90% savings) | $7-10/mo |
| **Total** | **~$20-25/mo** |

## Implementation Roadmap

### Phase 1: MVP (2-3 weeks)
- Discord bot scaffold (discord.py)
- Chroma vector store (embedded mode)
- Ingest ~200 core docs (patch notes, key wiki pages, unit stats CSV)
- OpenAI embeddings + Claude API for generation
- Deploy to Railway.app

### Phase 2: Production (Month 2)
- Migrate to Qdrant (self-hosted on VPS)
- Switch to Nomic Embed v2 (free, local)
- Ingest full corpus: all patch notes, 5-10K Discord messages, top 500 Reddit posts, ~200 wiki pages
- Implement hybrid search (BM25 + vector)
- Add metadata filtering for patch versions
- Enable Claude prompt caching

### Phase 3: Scale (Month 3+)
- Add reranker model for accuracy
- Fine-tune Nomic embeddings on WC3 corpus
- Implement feedback loop (thumbs up/down on answers)
- Consider GraphRAG for complex strategy questions

## Technical Details

### Chunking Strategy (by source type)
- **Discord messages**: Thread-based chunking, preserve author/timestamp/channel
- **Patch notes**: Semantic chunking by section (e.g., "Orc Changes", "Human Changes")
- **Wiki articles**: Recursive chunking by headers then paragraphs (512-1024 tokens, 100 token overlap)
- **Reddit posts**: No chunking needed, store post + top 3 comments as one document

### Hybrid Search
- BM25 for exact keyword matches ("patch 1.36.2 orc changes")
- Vector search for semantic queries ("what counters mass air?")
- Reciprocal Rank Fusion to merge results
- Optional reranker on top 20 results

### Key APIs & Tools
- Liquipedia API: https://liquipedia.net/api (60 req/hr)
- Reddit API: OAuth 2.0, 100 req/min free tier
- W3Champions API: website-backend.w3champions.com (already used in 4v4.gg)
- Discord archiver: https://github.com/Sciencentistguy/discord-channel-archiver
- JASS docs (game engine): https://github.com/lep/jassdoc (SQLite DB of all game functions)

## Open Questions
- Which Discord servers will grant archive permission?
- Should this integrate with 4v4.gg or be a standalone project?
- Is there appetite for a web UI in addition to Discord?
