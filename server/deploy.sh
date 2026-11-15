#!/bin/sh
# Deploy the chat relay to Fly. Run from anywhere: ./server/deploy.sh
#
# Uses an app-scoped deploy token from ~/.fly/4v4gg-chat-relay.deploy-token if
# one exists, so a deploy does not depend on the flyctl login session, which
# expires and cannot be renewed from a non-interactive shell. Create it once,
# in a real terminal (see OPERATIONS.md):
#
#   (umask 077 && fly tokens create deploy -a 4v4gg-chat-relay -x 8760h \
#      > ~/.fly/4v4gg-chat-relay.deploy-token)
#
# The token lives outside the repo on purpose. Do not put it in a shell
# profile: exporting it globally would point every fly command at this app.
set -e
cd "$(dirname "$0")"

TOKEN_FILE="$HOME/.fly/4v4gg-chat-relay.deploy-token"
if [ -z "$FLY_API_TOKEN" ] && [ -s "$TOKEN_FILE" ]; then
  FLY_API_TOKEN="$(cat "$TOKEN_FILE")"
  export FLY_API_TOKEN
fi

# --ha=false is not optional: a second machine forks the database.
exec fly deploy . --config fly.toml -a 4v4gg-chat-relay --ha=false "$@"
