# Blog idea: tilt

Status: parked 2026-11-13. Researched, not drafted.

## The question

Does a player who is tilted play worse in their next game?

## Where it got to

The win-rate version says no, and that result was not convincing. Some people are always angry in chat, so typed anger measures a habit. Tilt is being angrier than your own normal, and the first pass did not measure that.

## What was measured

Season 25, 240,000 player-games, plus chat from Aug 17 to Nov 13 2026.

Results by game outcome alone:

- Next-game win rate is 49.7% after a loss and 50.5% after a win. After five straight losses it is still 49.7%.
- Players requeue in 2.5 minutes after a loss and 3.9 after a win.
- They are more likely to keep playing after a loss (67%) than after a win (62%).
- Requeueing within a minute of a loss wins 49.1%. Waiting 15 minutes or more wins 50.6%.
- Sittings of 16 or more games win 48.3%, and 60% of them end on a win.

Results by anger in chat:

- Each message typed between one game ending and the next starting was scored: insult aimed at someone 3, profanity 2, blame words 1, caps 1, "!!" or "??" 1. A total of 4 or more counted as angry, 10 or more as raging.
- Angry and raging players won 50.0% of their next games, against 50.0% expected from team MMR (1,289 games).
- The result held without the 30-minute session rule and over the rest of the sitting.
- Typed anger does not rise with a losing streak: 3.3% of losses after one, 3.7% after four or more.
- Ten people wrote 22% of the angry windows.

## How to do it properly

- Define tilt per player: an anger score well above that player's own usual level, not an absolute threshold.
- Do not use team win or loss as the outcome. One player is an eighth of the game, and a drop worth about 45 MMR of one player's play would not show at roughly 1,200 tilted games.
- Use the player's own score line instead. `GET /api/matches/{id}` returns `playerScores` with `unitsKilled`, `expGained` and `goldCollected`. Take each as a share of the team total and compare with the player's own average.
- The streak version is worth testing the same way: after two or three losses in a row, does a player's share of kills and hero XP drop?

## Traps found along the way

- The W3C matches feed lists the winning team first. Team index is not a neutral orientation.
- The anger word list is mostly English. Chinese, Russian and French anger is undercounted.
- Chat and match clocks are both UTC and line up: 4% of messages are typed during the sender's own game, and messages peak in the two minutes after it ends.
- Measured exchange rate, from 54,601 games: 25 points of team-average MMR is about 5.5 points of win rate.

## A separate post that fell out of this

How a night of 4v4 ends. Half of all sittings are one or two games, people are more likely to stop after a win (37%) than a loss (31%), and the longest sitting of the season was 48 games in 21.5 hours. It does not depend on the tilt question.
