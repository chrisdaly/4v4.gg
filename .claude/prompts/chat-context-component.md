# Task: Build a unified ChatContext component for 4v4.gg

The project has 3 separate places that display chat messages, each with completely different UI:

1. **Admin Chat Search** (`src/pages/AdminChatSearch.jsx`) — Full search with context expansion, avatars, message grouping, time-windowed scrolling (Earlier/Later). Styled with styled-components. This is the most polished version — use it as the visual reference.

2. **Weekly Magazine Quote Browser** (`src/components/MessagePicker.jsx` + `QuoteBrowser` in `src/components/news/WeeklyMagazine.jsx`) — Loads scored messages for a spotlight player, shows a flat list with checkboxes for multi-select, no context expansion, no avatars, no grouping. Used to pick quotes for editorial cards.

3. **Daily News ChatContext** (`src/components/news/ChatContext.css`) — CSS-only styles for expanded chat context bubbles with avatar grouping, used in the daily digest view.

## Goal

Create a single shared `ChatContext` component that unifies all three into one reusable component at `src/components/ChatContext.jsx` with `src/components/ChatContext.css`. It should:

- **Display messages** grouped by consecutive speaker, with avatars (using `fetchAndCacheProfile` from `src/lib/profileCache.js`), timestamps, and message text
- **Multi-select mode** — checkboxes on each message, "Use N quotes" apply button. This replaces MessagePicker.jsx
- **Context expansion** — clicking a message loads surrounding conversation via the `/api/admin/messages/search/context` endpoint (like AdminChatSearch does)
- **Origin highlighting** — when context is expanded from a specific message, that message should be highlighted (gold left border + subtle background tint) and auto-scrolled into view, so the user can see where the original message sits in the conversation
- **Time window scrolling** — "Earlier" / "Later" buttons to shift the context window (like AdminChatSearch)
- **Filter input** — text filter to narrow visible messages
- **Keyword highlighting** — highlight search terms in message text (like AdminChatSearch's `HighlightText`)
- **Score display** — optional score column for scored message lists (weekly quote browser)

## Props interface

```jsx
<ChatContext
  messages={[{ name, text, score?, sentAt?, battle_tag? }]}
  loading={boolean}
  onApply={(selectedItems) => void}  // multi-select callback
  selectable={boolean}               // enable multi-select checkboxes
  expandable={boolean}               // enable context expansion on click
  showScores={boolean}               // show score column
  applyLabel={(count) => string}     // custom apply button label
  placeholder={string}               // filter input placeholder
  highlight={string}                 // text to highlight in messages
/>
```

## Then refactor the 3 consumers

1. `AdminChatSearch.jsx` — use `<ChatContext>` for the context expansion panel (keep the search form and result list as-is, but replace the inline context message display)
2. `WeeklyMagazine.jsx` `QuoteBrowser` — replace `<MessagePicker>` with `<ChatContext selectable expandable showScores>`
3. Daily news ChatContext usage — replace CSS-only approach with the shared component

## Design system

Use tokens from `src/lib/design-tokens.js`. Reference `src/pages/StyleReference.jsx` for patterns. Key tokens: `--gold`, `--surface-1`, `--surface-2`, `--grey-mid`, `--font-mono`, `--font-display`, `--text-xs`, `--text-xxs`, `--radius-sm`.

## Backend endpoints (already exist)

- `GET /api/admin/messages/search?q=&limit=50&offset=0` — search messages
- `GET /api/admin/messages/search/context?received_at=&padding=5` — context around a message
- `GET /api/admin/weekly-digest/:weekStart/player-messages?statKey=&battleTag=` — scored player messages for weekly quotes

## Chat relay

`VITE_CHAT_RELAY_URL` env var, defaults to `https://4v4gg-chat-relay.fly.dev`

## Cleanup

After building the component, delete `src/components/MessagePicker.jsx` and `src/components/MessagePicker.css` since they'll be replaced.
