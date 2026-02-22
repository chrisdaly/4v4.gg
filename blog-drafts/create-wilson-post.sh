#!/bin/bash
# Creates the Wilson Score blog post via the API.
# Usage: ./create-wilson-post.sh [SERVER_URL]
# Default: http://localhost:3002

SERVER="${1:-http://localhost:3002}"
API_KEY="45e11911f5cb54b95508d4268d8db4dc9aff1fa7813ef330"

# Read markdown content from file
CONTENT=$(cat "$(dirname "$0")/wilson-score.md")

# Escape for JSON
CONTENT_JSON=$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$CONTENT")

curl -s -X POST "${SERVER}/api/blog" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"slug\": \"wilson-score-ranking\",
    \"title\": \"Sorting With Incomplete Data\",
    \"description\": \"Why raw win rates lie, and how Wilson score fixes player rankings on 4v4.gg.\",
    \"date\": \"Feb 2025\",
    \"tags\": [\"stats\", \"ranking\", \"wc3\"],
    \"content\": ${CONTENT_JSON},
    \"published\": false
  }" | python3 -m json.tool
