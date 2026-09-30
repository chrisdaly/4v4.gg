# The weekly issue

What it is, so it stops being rediscovered one card at a time. Agreed with
Chris 2026-09-30.

## Who it is for

Both kinds of reader, and the same page has to serve them:

- **Someone who played that week.** They want the gossip and the receipts.
  They already know who xlrenxuanwei is. Do not explain him.
- **Someone catching up.** They want to know what happened without having
  been there. A story has to stand up without the reader having seen it.

In practice: never explain a name, always explain an event.

## Shape

One lead and three briefs. That is the whole editorial budget.

| | |
|---|---|
| Cover | headline, issue number, date range |
| Standfirst | the claim, about 180 characters, two sentences |
| Top story | body and quotes. One per issue |
| Also this week | three briefs, each a headline, two or three sentences, a quote |
| Quote of the week | one line, printed big |
| Spotlight cards | winner, loser, grinder, hot streak, cold streak, hero slayer |
| Power rankings | top five and bottom five, 20-game floor |
| Streak spectrum | the ladder's runs of wins and losses |
| New blood | debuts with 20+ games |
| Player trend | 16 weeks, with a sentence saying what it means |

A fourth brief pushes the first one out. The page does not quietly grow.

## Voice

A reporter who plays. Plain, specific, dry.

- State the point, then the reasoning. Never set up a reveal.
- ASCII only. No em-dashes.
- Say only what the log shows. If it does not say why, do not guess.
- Never invent a name, a number or an event.
- Quotes carry the flavour. Everything else counts things.

## What is a story

A subject the room argued about, not a player who was mentioned a lot. A
name spiking is who the week was about; it belongs in Most Talked About, not
in a brief. See `server/src/storyCandidates.js`.

Two detectors, because a week has two shapes of story: bursts (an argument,
found by messages per minute) and slow themes (a subject running above its
four-week baseline, which never spikes and so is invisible to the first).

## Rules that have bitten

- Issues are keyed to a **Monday** and cover the last **complete** week.
- A stat card is a **feat or a fact**, not a rate. Hero slayer is the most
  kills in one game, not the weekly total, because a total measures
  attendance.
- **Omit a section rather than fake it.** No upsets that week means no
  upsets section.
- One player, one card, except where the card is a record.
- **Nothing is published without Chris approving that issue.**

## Where the work happens

`/news-desk` builds an issue: candidates, stories, quote of the week,
numbers, save, publish. `/news?week=` is what a reader sees. Removals are
recorded in `GRAVEYARD.md`.
