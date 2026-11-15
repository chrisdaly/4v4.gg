/**
 * Operator alerts: one call, every configured channel.
 *
 * A warning that only reaches the log is not a warning - the relay sat with
 * imports paused on a full disk and nobody knew. Each channel reports what it
 * did, so the caller (and POST /api/admin/alert-test) can tell "sent" from
 * "not configured" from "failed", instead of assuming.
 *
 * Channels:
 *  - GitHub issue, label `relay-ops` (GITHUB_TOKEN + GITHUB_REPO)
 *  - Email via Resend (RESEND_API_KEY + ALERT_EMAIL_TO)
 */
import config from './config.js';

async function fileGithubIssue(title, body) {
  if (!config.GITHUB_TOKEN || !config.GITHUB_REPO) return { status: 'not_configured' };
  const [owner, repo] = config.GITHUB_REPO.split('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({ title, body, labels: ['relay-ops'] }),
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const issue = await response.json();
  return { status: 'sent', detail: issue.html_url };
}

async function sendEmail(subject, text) {
  if (!config.RESEND_API_KEY || !config.ALERT_EMAIL_TO) return { status: 'not_configured' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.ALERT_EMAIL_FROM,
      to: [config.ALERT_EMAIL_TO],
      subject,
      text,
    }),
  });
  if (!response.ok) throw new Error(`Resend API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const sent = await response.json();
  return { status: 'sent', detail: sent.id };
}

/**
 * Send an alert on every channel. Never throws.
 * Returns { github, email }, each { status: 'sent' | 'not_configured' | 'failed', detail? }.
 */
export async function sendAlert({ title, body }) {
  const channels = { github: () => fileGithubIssue(title, body), email: () => sendEmail(title, body) };
  const outcome = {};
  for (const [name, send] of Object.entries(channels)) {
    try {
      outcome[name] = await send();
    } catch (err) {
      outcome[name] = { status: 'failed', detail: err.message };
      console.error(`[Alerts] ${name} failed:`, err.message);
    }
  }
  return outcome;
}

export const alertDelivered = (outcome) => Object.values(outcome).some((c) => c.status === 'sent');
