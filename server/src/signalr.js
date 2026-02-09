import * as signalR from '@microsoft/signalr';
import { getToken } from './db.js';
import { insertMessage, insertMessages, markDeleted, markBulkDeleted, insertEvent } from './db.js';
import { broadcast } from './sse.js';
import { handleCommand } from './bot.js';
import { maybeTranslate } from './translate.js';

const CHAT_HUB_URL = 'https://chat-service.w3champions.com/chatHub';
const ROOM = '4 vs 4';

let connection = null;
let currentToken = null;
let state = 'Disconnected';
let onlineUsers = new Map(); // battleTag → { battleTag, name, clanTag }

function normalizeMessage(raw, room) {
  return {
    id: raw.id,
    battleTag: raw.user?.battleTag || raw.battleTag || '',
    userName: raw.user?.name || raw.userName || '',
    clanTag: raw.user?.clanTag || raw.clanTag || '',
    message: raw.message,
    sentAt: raw.time || raw.sentDate || raw.sentAt || new Date().toISOString(),
    room: room || ROOM,
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

async function connect() {
  if (connection) {
    try { await connection.stop(); } catch {}
  }

  // Pass token in URL directly — the Node.js SignalR client has issues
  // with accessTokenFactory not appending the token to WebSocket URLs
  const hubUrl = `${CHAT_HUB_URL}?access_token=${encodeURIComponent(currentToken)}`;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  // On reconnected, re-join the room (groups are lost on reconnect)
  connection.onreconnected(() => {
    console.log('[SignalR] Reconnected, re-joining room');
    state = 'Connected';
    connection.invoke('SwitchRoom', ROOM).catch(err =>
      console.error('[SignalR] Failed to re-join room:', err.message)
    );
  });

  connection.onreconnecting((err) => {
    state = 'Reconnecting';
    console.log('[SignalR] Reconnecting...', err?.message || '');
    onlineUsers.clear();
    broadcast('users_init', []);
    broadcast('status', { state });
  });

  connection.onclose((err) => {
    state = 'Disconnected';
    console.log('[SignalR] Disconnected', err?.message || '');
    broadcast('status', { state });
  });

  // StartChat — (usersOfRoom, messages, chatRoom, defaultRooms?)
  connection.on('StartChat', (...args) => {
    const usersOfRoom = args[0] || [];
    const messages = args[1] || [];
    const room = args[2] || ROOM;

    // Rebuild online users from the full user list
    onlineUsers.clear();
    if (Array.isArray(usersOfRoom)) {
      for (const u of usersOfRoom) {
        if (u?.battleTag) {
          onlineUsers.set(u.battleTag, {
            battleTag: u.battleTag,
            name: u.name || '',
            clanTag: u.clanTag || '',
          });
        }
      }
    }
    broadcast('users_init', [...onlineUsers.values()]);
    console.log(`[SignalR] StartChat: ${messages.length} messages, ${onlineUsers.size} users in "${room}"`);

    if (!Array.isArray(messages)) return;
    const normalized = messages.map(m => normalizeMessage(m, room));
    insertMessages(normalized);
  });

  // ReceiveMessage — new message
  connection.on('ReceiveMessage', (data) => {
    const msg = normalizeMessage(data, ROOM);
    console.log(`[SignalR] Message from ${msg.userName}: ${msg.message.substring(0, 50)}`);
    const result = insertMessage(msg);
    if (result.changes > 0) {
      broadcast('message', msg);
    }

    // Check for bot commands
    if (msg.message.startsWith('!')) {
      handleCommand(msg.message, msg.battleTag, msg.userName);
    }

    // Auto-translate non-English messages
    maybeTranslate(msg.id, msg.message);
  });

  // MessageDeleted — single message deleted by mod
  connection.on('MessageDeleted', (messageId) => {
    console.log(`[SignalR] Message deleted: ${messageId}`);
    markDeleted(messageId);
    broadcast('delete', { id: messageId });
  });

  // BulkMessageDeleted — multiple messages deleted
  connection.on('BulkMessageDeleted', (messageIds) => {
    console.log(`[SignalR] Bulk delete: ${messageIds.length} messages`);
    markBulkDeleted(messageIds);
    broadcast('bulk_delete', { ids: messageIds });
  });

  // AuthorizationFailed — token invalid
  connection.on('AuthorizationFailed', () => {
    state = 'auth_failed';
    console.error('[SignalR] Authorization failed — token is invalid');
    broadcast('status', { state });
    connection.stop();
  });

  // PlayerBannedFromChat — user is muted/banned
  connection.on('PlayerBannedFromChat', (mute) => {
    state = 'banned';
    console.error('[SignalR] Banned from chat:', JSON.stringify(mute));
    broadcast('status', { state });
    connection.stop();
  });

  connection.on('UserEntered', (user) => {
    console.log(`[SignalR] UserEntered: ${user?.name}`);
    if (user?.battleTag) {
      const userData = {
        battleTag: user.battleTag,
        name: user.name || '',
        clanTag: user.clanTag || '',
      };
      onlineUsers.set(user.battleTag, userData);
      broadcast('user_joined', userData);
      insertEvent('join', { battleTag: user.battleTag, name: user.name || '', clanTag: user.clanTag || '' });
    }
  });
  connection.on('UserLeft', (user) => {
    console.log(`[SignalR] UserLeft: ${user?.name}`);
    if (user?.battleTag) {
      onlineUsers.delete(user.battleTag);
      broadcast('user_left', { battleTag: user.battleTag });
      insertEvent('leave', { battleTag: user.battleTag, name: user.name || '', clanTag: user.clanTag || '' });
    }
  });

  try {
    await connection.start();
    state = 'Connected';
    console.log('[SignalR] Connected to chat hub');
    broadcast('status', { state });

    await connection.invoke('SwitchRoom', ROOM);
    console.log(`[SignalR] Joined room: ${ROOM}`);
  } catch (err) {
    state = 'error';
    console.error('[SignalR] Connection failed:', err.message);
    broadcast('status', { state });
  }
}

export async function updateToken(jwt) {
  currentToken = jwt;
  console.log('[SignalR] Token updated, reconnecting...');
  await connect();
}

export async function stopSignalR() {
  if (connection) {
    try { await connection.stop(); } catch {}
    connection = null;
  }
  state = 'Disconnected';
}

export function getStatus() {
  return {
    state,
    hasToken: !!currentToken,
  };
}

export async function sendMessage(text) {
  if (!connection || state !== 'Connected') {
    throw new Error('Not connected to chat');
  }
  await connection.invoke('SendMessage', text);
}

export function getOnlineUsers() {
  return [...onlineUsers.values()];
}
