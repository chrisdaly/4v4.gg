import Anthropic from '@anthropic-ai/sdk';
import config from './config.js';
import {
  searchMessagesByKeywords,
  getMessagesInTimeRange,
  insertFeedbackIssue,
  getFeedbackIssueTriggerIds,
  getRecentFeedbackIssues,
} from './db.js';

const KEYWORDS = ['4v4.gg', 'foals'];
const CONTEXT_WINDOW_MINUTES = 5;

const FEEDBACK_SYSTEM_PROMPT = `You are a feedback classifier for 4v4.gg, a Warcraft III 4v4 community website.

You will receive a conversation from the W3Champions 4v4 chat room. Some messages mention "4v4.gg" or "foals" (the site creator).

Your job: determine if the conversation contains actionable feedback about the 4v4.gg website.

Classify as one of:
- bug: Something is broken or not working correctly on 4v4.gg
- feature_request: A suggestion for something new to add to 4v4.gg
- complaint: A specific complaint about how something works on 4v4.gg (not just general negativity)
- praise: Positive feedback about 4v4.gg (not actionable but worth noting)
- not_actionable: Casual mention, off-topic, or too vague to act on

Be conservative. Most mentions are casual and not_actionable. Only classify as actionable (bug, feature_request, complaint) if there is a clear, specific piece of feedback.

Examples of NOT actionable:
- "check out 4v4.gg" (just a mention)
- "foals is good" (vague praise)
- "i use 4v4.gg" (just a mention)

Examples of actionable:
- "4v4.gg doesn't show my MMR correctly" (bug)
- "wish 4v4.gg had replays" (feature_request)
- "the stats page on 4v4.gg is confusing" (complaint)

Return ONLY valid JSON (no markdown fences):
{
  "actionable": boolean,
  "type": "bug" | "feature_request" | "complaint" | "praise" | "not_actionable",
  "title": "Short title for the feedback (if actionable)",
  "body": "1-2 sentence summary of what the user wants or what's wrong (if actionable)",
  "priority": "low" | "medium" | "high"
}`;

/**
 * Format messages into a readable conversation for AI analysis.
 */
function formatConversation(messages) {
  return messages.map(m => {
    const time = m.received_at.slice(11, 16); // HH:MM
    const clan = m.clan_tag ? `[${m.clan_tag}]` : '';
    return `${clan}${m.user_name} (${time}): ${m.message}`;
  }).join('\n');
}

/**
 * Format a SQLite datetime string for display.
 */
function toSqliteDatetime(date) {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

/**
 * Cluster keyword-matching messages into conversation groups.
 * Each match gets a ±CONTEXT_WINDOW_MINUTES window, overlapping windows merge.
 */
function clusterMessages(matches) {
  if (matches.length === 0) return [];

  const pad = CONTEXT_WINDOW_MINUTES * 60 * 1000;
  const windows = matches.map(m => {
    const t = new Date(m.received_at + 'Z').getTime();
    return { from: t - pad, to: t + pad, triggerIds: [m.id] };
  });

  // Sort by start time
  windows.sort((a, b) => a.from - b.from);

  // Merge overlapping windows
  const merged = [windows[0]];
  for (let i = 1; i < windows.length; i++) {
    const last = merged[merged.length - 1];
    if (windows[i].from <= last.to) {
      last.to = Math.max(last.to, windows[i].to);
      last.triggerIds.push(...windows[i].triggerIds);
    } else {
      merged.push({ ...windows[i] });
    }
  }

  return merged.map(w => ({
    from: toSqliteDatetime(new Date(w.from)),
    to: toSqliteDatetime(new Date(w.to)),
    triggerIds: w.triggerIds,
  }));
}

/**
 * Analyze a conversation cluster with Claude.
 */
async function analyzeCluster(messages) {
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const conversation = formatConversation(messages);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: FEEDBACK_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: conversation }],
  });

  const text = response.content[0]?.text || '';
  try {
    return JSON.parse(text);
  } catch {
    console.error('[Feedback] Failed to parse AI response:', text);
    return { actionable: false, type: 'not_actionable', title: '', body: '', priority: 'low' };
  }
}

/**
 * Create a GitHub issue for actionable feedback.
 */
async function createGithubIssue(aiResult, messages) {
  const [owner, repo] = config.GITHUB_REPO.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;

  // Format chat context as blockquote
  const chatContext = messages.map(m => {
    const time = m.received_at.slice(11, 16);
    const clan = m.clan_tag ? `[${m.clan_tag}]` : '';
    return `> **${clan}${m.user_name}** ${time}\n> ${m.message}`;
  }).join('\n>\n');

  const date = new Date().toISOString().slice(0, 10);
  const body = `## Summary\n${aiResult.body}\n\n**Type:** ${aiResult.type}\n**Priority:** ${aiResult.priority}\n\n## Chat Context\n${chatContext}\n\n## Source\nDetected ${date} from W3C 4v4 chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      title: `[Chat] ${aiResult.title}`,
      body,
      labels: ['chat-feedback', aiResult.type],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GitHub API ${response.status}: ${err}`);
  }

  return await response.json();
}

/**
 * Run a full feedback scan over the last 24 hours.
 */
export async function runFeedbackScan() {
  if (!config.ANTHROPIC_API_KEY) {
    console.log('[Feedback] No Anthropic API key, skipping');
    return { matches: 0, clusters: 0, issues: 0 };
  }

  console.log('[Feedback] Starting scan...');

  // 1. Find keyword matches
  const matches = searchMessagesByKeywords(KEYWORDS, 24);
  console.log(`[Feedback] Found ${matches.length} keyword matches`);
  if (matches.length === 0) return { matches: 0, clusters: 0, issues: 0 };

  // 2. Cluster into conversation groups
  const clusters = clusterMessages(matches);
  console.log(`[Feedback] Formed ${clusters.length} conversation clusters`);

  // 3. Get already-processed trigger IDs
  const processedIds = getFeedbackIssueTriggerIds(48);

  let issuesCreated = 0;

  for (const cluster of clusters) {
    // Skip if all trigger messages were already processed
    const newTriggerIds = cluster.triggerIds.filter(id => !processedIds.has(id));
    if (newTriggerIds.length === 0) {
      console.log('[Feedback] Skipping already-processed cluster');
      continue;
    }

    // 4. Fetch full context for this cluster
    const contextMessages = getMessagesInTimeRange(cluster.from, cluster.to);
    if (contextMessages.length === 0) continue;

    // 5. AI analysis
    const aiResult = await analyzeCluster(contextMessages);
    console.log(`[Feedback] Cluster analyzed: ${aiResult.type} (actionable: ${aiResult.actionable})`);

    // 6. Create GitHub issue if actionable and token available
    let githubIssue = null;
    if (aiResult.actionable && config.GITHUB_TOKEN) {
      try {
        githubIssue = await createGithubIssue(aiResult, contextMessages);
        console.log(`[Feedback] Created issue #${githubIssue.number}: ${githubIssue.html_url}`);
        issuesCreated++;
      } catch (err) {
        console.error('[Feedback] GitHub issue creation failed:', err.message);
      }
    } else if (aiResult.actionable && !config.GITHUB_TOKEN) {
      console.log('[Feedback] Actionable feedback found but no GITHUB_TOKEN configured');
    }

    // 7. Store record
    insertFeedbackIssue({
      triggerMsgIds: cluster.triggerIds,
      githubIssueNumber: githubIssue?.number || null,
      githubIssueUrl: githubIssue?.html_url || null,
      aiType: aiResult.type,
      aiTitle: aiResult.title || null,
      aiPriority: aiResult.priority || null,
      actionable: aiResult.actionable,
    });
  }

  const summary = { matches: matches.length, clusters: clusters.length, issues: issuesCreated };
  console.log(`[Feedback] Scan complete:`, summary);
  return summary;
}

/**
 * Start the daily feedback scheduler. Runs at 06:00 UTC.
 */
export function startFeedbackScheduler() {
  if (!config.ANTHROPIC_API_KEY) {
    console.log('[Feedback] No API key, skipping feedback scheduler');
    return;
  }

  let lastScanDate = '';
  setInterval(() => {
    const now = new Date();
    const hour = now.getUTCHours();
    const todayStr = now.toISOString().slice(0, 10);
    if (hour === 6 && todayStr !== lastScanDate) {
      lastScanDate = todayStr;
      runFeedbackScan().catch(err => {
        console.error('[Feedback] Scheduled scan error:', err.message);
      });
    }
  }, 60 * 1000);

  console.log('[Feedback] Scheduler started (daily at 06:00 UTC)');
}

/**
 * Get recent feedback detections for admin viewing.
 */
export function getRecentFeedback(limit = 20) {
  return getRecentFeedbackIssues(limit);
}
