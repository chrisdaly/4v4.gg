/**
 * W3C JWT expiry monitor.
 *
 * W3C tokens are hardcoded to expire 7 days after issue (see
 * w3champions/identification-service) and are only validated at SignalR
 * handshake — so an expired token means silent chat-capture loss on the next
 * reconnect. This monitor logs loudly and files a GitHub issue once per token
 * when expiry is <24h away (or auth has already failed).
 */
import config from './config.js';
import { getToken, getSetting, setSetting } from './db.js';
import { getStatus } from './signalr.js';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const WARN_BEFORE_MS = 24 * 60 * 60 * 1000;
const ISSUE_DEDUPE_KEY = 'token_issue_filed_for_exp';

export function decodeJwtExpMs(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getTokenHealth() {
  const token = getToken();
  const expMs = token ? decodeJwtExpMs(token) : null;
  const status = getStatus();
  return {
    signalr: status.state,
    hasToken: !!token,
    tokenExpiresAt: expMs ? new Date(expMs).toISOString() : null,
    tokenExpiresInHours: expMs ? Math.round(((expMs - Date.now()) / 36e5) * 10) / 10 : null,
    lastAuthFailureAt: status.lastAuthFailureAt ? new Date(status.lastAuthFailureAt).toISOString() : null,
  };
}

async function fileGithubIssue(title, body) {
  if (!config.GITHUB_TOKEN || !config.GITHUB_REPO) return null;
  const [owner, repo] = config.GITHUB_REPO.split('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({ title, body, labels: ['relay-ops'] }),
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  return await response.json();
}

async function check() {
  const token = getToken();
  if (!token) return;
  const expMs = decodeJwtExpMs(token);
  if (!expMs) return;

  const status = getStatus();
  const remaining = expMs - Date.now();
  const expIso = new Date(expMs).toISOString();
  const authFailedRecently =
    status.lastAuthFailureAt && Date.now() - status.lastAuthFailureAt < 60 * 60 * 1000;

  if (remaining >= WARN_BEFORE_MS && !authFailedRecently) return;

  const expired = remaining <= 0;
  console.error(
    `[TokenMonitor] W3C JWT ${expired ? 'EXPIRED' : `expires in ${Math.round(remaining / 36e5)}h`} (${expIso}); signalr: ${status.state}${authFailedRecently ? ', auth recently failed' : ''}`
  );

  // One issue per token — keyed on its exp timestamp, persisted across restarts
  if (getSetting(ISSUE_DEDUPE_KEY) === String(expMs)) return;

  const title = expired || authFailedRecently
    ? '[Relay] W3C chat token invalid — chat capture is DOWN'
    : '[Relay] W3C chat token expires within 24h';
  const body = [
    `The W3C JWT used by the chat relay ${expired ? 'expired' : 'expires'} at **${expIso}**.`,
    authFailedRecently ? `\nSignalR authorization is currently failing — messages are NOT being captured.` : '',
    `\n**Renewal** (tokens last 7 days, no refresh endpoint exists):`,
    `1. Log into w3champions.com, copy the \`eyJ…\` JWT from localStorage (DevTools → Application).`,
    `2. Inject it:`,
    '```',
    `curl -X POST https://4v4gg-chat-relay.fly.dev/api/admin/token \\`,
    `  -H "X-API-Key: $ADMIN_API_KEY" -H "Content-Type: application/json" \\`,
    `  -d '{"token":"<JWT>"}'`,
    '```',
    `\nSee \`server/OPERATIONS.md\` → "W3C chat token".`,
  ].join('\n');

  try {
    const issue = await fileGithubIssue(title, body);
    if (issue) console.log(`[TokenMonitor] Filed issue #${issue.number}: ${issue.html_url}`);
    setSetting(ISSUE_DEDUPE_KEY, String(expMs));
  } catch (err) {
    console.error('[TokenMonitor] Failed to file GitHub issue:', err.message);
  }
}

export function startTokenMonitor() {
  setTimeout(() => check().catch(() => {}), 30_000); // first check shortly after boot
  setInterval(() => check().catch(() => {}), CHECK_INTERVAL_MS);
  console.log('[TokenMonitor] Started (checks every 30 min, warns 24h before expiry)');
}
