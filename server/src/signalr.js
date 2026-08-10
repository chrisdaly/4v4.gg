import * as signalR from '@microsoft/signalr';
import { getToken } from './db.js';
import { insertMessage, insertMessages, markDeleted, markBulkDeleted, insertEvent } from './db.js';
import { broadcast } from './sse.js';
import { handleCommand } from './bot.js';
import { maybeTranslate } from './translate.js';

const CHAT_HUB_URL = 'https://chat-service.w3champions.com/chatHub';
const AUTH_SESSION_URL = 'https://chat-service.w3champions.com/auth/session';
const ROOM = '4 vs 4';

let connection = null;
let currentToken = null;
let currentChannelId = null;
let state = 'Disconnected';
let onlineUsers = new Map(); // battleTag → { battleTag, name }
let reconnectTimer = null;
let reconnectAttempt = 0;
let lastAuthFailureAt = null;

function scheduleReconnect() {
  if (state === 'auth_failed' || state === 'banned' || state === 'stopped') return;
  if (reconnectTimer) return; // already scheduled

  const delay = Math.min(60000 * Math.pow(2, reconnectAttempt), 600000); // 1m, 2m, 4m, 8m, 10m max
  reconnectAttempt++;
  console.log(`[SignalR] Scheduling reconnect attempt ${reconnectAttempt} in ${delay / 1000}s`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect().catch(err => {
      console.error('[SignalR] Reconnect failed:', err.message);
      scheduleReconnect();
    });
  }, delay);
}

// Normalize a MessageReceived payload to our internal message shape.
// W3C changed the payload in August 2026: sender is now nested under Sender/sender,
// and message text is Content/content instead of message.
function normalizeMessage(raw) {
  const sender = raw.Sender || raw.sender || {};
  return {
    id: raw.Id || raw.id || '',
    battleTag: sender.BattleTag || sender.battleTag || raw.battleTag || '',
    userName: sender.Name || sender.name || raw.userName || '',
    clanTag: '',
    message: raw.Content || raw.content || raw.message || '',
    sentAt: raw.SentAt || raw.sentAt || new Date().toISOString(),
    room: ROOM,
  };
}

export async function startSignalR() {
  currentToken = getToken();
  if (!currentToken) {
    state = 'no_token';
    console.log('[SignalR] No token stored. Waiting for token via /api/admin/token');
    return;
  }

  await connect();
}

// W3C chat service now requires a one-time ticket (not a raw JWT) as the
// access_token. Tickets expire in 60s and are single-use.
async function mintTicket() {
  const res = await fetch(AUTH_SESSION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${currentToken}` },
  });
  if (res.status === 401) {
    const err = new Error('JWT invalid or expired (401) — inject a fresh token via /api/admin/token');
    err.isAuthError = true;
    throw err;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ticket mint failed (${res.status}): ${body}`);
  }
  const { ticket } = await res.json();
  if (!ticket) throw new Error('Ticket mint returned no ticket');
  return ticket;
}

async function connect() {
  if (connection) {
    try { await connection.stop(); } catch {}
  }

  // Mint a fresh one-time ticket — W3C no longer accepts raw JWTs at the hub
  let ticket;
  try {
    ticket = await mintTicket();
    console.log('[SignalR] Ticket minted successfully');
  } catch (err) {
    console.error('[SignalR] Failed to mint ticket:', err.message);
    if (err.isAuthError) {
      state = 'auth_failed';
      lastAuthFailureAt = Date.now();
      broadcast('status', { state });
    } else {
      // Transient error (network, rate limit, etc.) — retry with backoff
      state = 'error';
      broadcast('status', { state });
      scheduleReconnect();
    }
    return;
  }

  const hubUrl = `${CHAT_HUB_URL}?access_token=${encodeURIComponent(ticket)}`;

  // No withAutomaticReconnect — tickets are single-use so any reconnect
  // attempt by SignalR would reuse a consumed ticket. Our scheduleReconnect()
  // → connect() flow mints a fresh ticket on every attempt.
  connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.onclose((err) => {
    state = 'Disconnected';
    currentChannelId = null;
    console.log('[SignalR] Disconnected', err?.message || '');
    broadcast('status', { state });
    scheduleReconnect();
  });

  // MessageReceived — new message (was ReceiveMessage before Aug 2026)
  connection.on('MessageReceived', (data) => {
    const msg = normalizeMessage(data);
    console.log(`[SignalR] Message from ${msg.userName}: ${msg.message.substring(0, 50)}`);
    const result = insertMessage(msg);
    if (result.changes > 0) {
      broadcast('message', msg);
    }
    if (msg.message.startsWith('!')) {
      handleCommand(msg.message, msg.battleTag, msg.userName);
    }
    maybeTranslate(msg.id, msg.message);
  });

  // ViewersChanged — roster delta (was UserEntered/UserLeft before Aug 2026)
  // Payload: { ChannelId/channelId, Joined/joined: [{BattleTag, Name}], Left/left: [battleTag strings] }
  connection.on('ViewersChanged', (data) => {
    const joined = data?.Joined || data?.joined || [];
    const left = data?.Left || data?.left || [];

    for (const u of joined) {
      const battleTag = u?.BattleTag || u?.battleTag;
      const name = u?.Name || u?.name || '';
      if (!battleTag) continue;
      const userData = { battleTag, name, joinedAt: Date.now() };
      onlineUsers.set(battleTag, userData);
      broadcast('user_joined', userData);
      insertEvent('join', { battleTag, name, clanTag: '' });
      console.log(`[SignalR] ViewersChanged joined: ${name}`);
    }
    for (const battleTag of left) {
      if (!battleTag) continue;
      onlineUsers.delete(battleTag);
      broadcast('user_left', { battleTag });
      insertEvent('leave', { battleTag, name: '', clanTag: '' });
      console.log(`[SignalR] ViewersChanged left: ${battleTag}`);
    }
  });

  // MessageDeleted — new payload: { ChannelId, MessageId } (was a bare messageId string)
  connection.on('MessageDeleted', (data) => {
    const messageId = data?.MessageId || data?.messageId || data;
    console.log(`[SignalR] Message deleted: ${messageId}`);
    if (messageId) {
      markDeleted(messageId);
      broadcast('delete', { id: messageId });
    }
  });

  // BulkMessagesDeleted — new plural name, payload: { ChannelId, MessageIds }
  // Also keep old singular name in case the server still emits it
  const handleBulkDelete = (data) => {
    const ids = data?.MessageIds || data?.messageIds || (Array.isArray(data) ? data : []);
    console.log(`[SignalR] Bulk delete: ${ids.length} messages`);
    if (ids.length > 0) {
      markBulkDeleted(ids);
      broadcast('bulk_delete', { ids });
    }
  };
  connection.on('BulkMessagesDeleted', handleBulkDelete);
  connection.on('BulkMessageDeleted', handleBulkDelete);

  // AuthorizationFailed — hub rejected the ticket (e.g. it expired before the
  // WebSocket connected). onclose fires next and scheduleReconnect() will mint
  // a fresh ticket on the next attempt.
  connection.on('AuthorizationFailed', () => {
    state = 'auth_failed';
    lastAuthFailureAt = Date.now();
    console.error('[SignalR] Authorization failed — ticket rejected by hub');
    broadcast('status', { state });
    connection.stop();
  });

  // PlayerBannedFromChat — relay account muted/banned
  connection.on('PlayerBannedFromChat', (mute) => {
    state = 'banned';
    console.error('[SignalR] Banned from chat:', JSON.stringify(mute));
    broadcast('status', { state });
    connection.stop();
  });

  try {
    await connection.start();
    state = 'Connected';
    reconnectAttempt = 0;
    lastAuthFailureAt = null;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    console.log('[SignalR] Connected to chat hub');
    broadcast('status', { state });

    // JoinChannel returns { Code, Channel: { Id, ... }, Membership }
    const joinResult = await connection.invoke('JoinChannel', ROOM);
    const channelId = joinResult?.Channel?.Id || joinResult?.channel?.id;
    if (!channelId) throw new Error(`JoinChannel returned no channel ID (code: ${joinResult?.Code})`);
    currentChannelId = channelId;
    console.log(`[SignalR] Joined channel "${ROOM}" (id: ${channelId})`);

    // FocusChannel subscribes to live MessageReceived delivery and returns current viewer roster
    const focusResult = await connection.invoke('FocusChannel', channelId);
    const viewers = focusResult?.Viewers || focusResult?.viewers || [];
    onlineUsers.clear();
    const now = Date.now();
    for (const v of viewers) {
      const battleTag = v?.BattleTag || v?.battleTag;
      if (!battleTag) continue;
      onlineUsers.set(battleTag, { battleTag, name: v?.Name || v?.name || '', joinedAt: now });
    }
    broadcast('users_init', [...onlineUsers.values()]);
    console.log(`[SignalR] Focused channel, ${onlineUsers.size} viewers`);
  } catch (err) {
    state = 'error';
    console.error('[SignalR] Connection failed:', err.message);
    broadcast('status', { state });
    scheduleReconnect();
  }
}

export async function updateToken(jwt) {
  currentToken = jwt;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  reconnectAttempt = 0;
  console.log('[SignalR] Token updated, reconnecting...');
  await connect();
}

export async function stopSignalR() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  state = 'stopped';
  if (connection) {
    try { await connection.stop(); } catch {}
    connection = null;
  }
}

export function getStatus() {
  return {
    state,
    hasToken: !!currentToken,
    lastAuthFailureAt,
  };
}

export async function sendMessage(text) {
  if (!connection || state !== 'Connected') {
    throw new Error('Not connected to chat');
  }
  if (!currentChannelId) {
    throw new Error('Channel not yet joined');
  }
  await connection.invoke('SendMessage', currentChannelId, text);
}

export function getOnlineUsers() {
  return [...onlineUsers.values()];
}
