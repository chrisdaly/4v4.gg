A player goes 3-0 on Twilight Ruins. Another goes 47-19. Sort by win rate and the 3-0 player ranks first: 100% beats 71%. But which player actually performs better on that map?

Raw win rate rewards small samples and punishes large ones. Every ranking on 4v4.gg that touches win/loss records has this problem: best allies, worst allies, nemesis, best maps, worst maps.

## The Minimum Games Hack

The obvious fix is a minimum games threshold. Only rank maps with 10+ matches. This works until you have to pick the number: too low and noise sneaks through, too high and you hide real patterns.

It also creates a cliff. A player with 4 games is invisible; a player with 5 appears instantly. The threshold is arbitrary.

## Wilson Score

Wilson score computes a confidence interval for a win rate given a sample size. You sort by the lower bound: "what's the worst this rate plausibly is?"

A 3-0 record has a wide interval; lower bound lands around 44%. A 47-19 record has a tight interval; lower bound sits near 62%. The 47-19 player ranks higher.

| Ally | Record | Win Rate | Wilson LB |
|------|--------|----------|-----------|
| Player A | 3-0 | 100% | 43.8% |
| Player B | 7-2 | 78% | 45.3% |
| Player C | 15-4 | 79% | 57.8% |

No threshold needed. Small samples sort themselves to the bottom naturally; the transition is smooth, not a cliff.

## The Implementation

Six lines. Used for best allies, worst allies, nemesis, and best/worst maps:

```js
const wilsonLB = (wins, total) => {
  if (total === 0) return 0;
  const z = 1.96;
  const p = wins / total;
  const d = 1 + z * z / total;
  return (p + z * z / (2 * total)
    - z * Math.sqrt((p * (1 - p)
    + z * z / (4 * total)) / total)) / d;
};
```

The display still shows raw win rate, because that's what players expect. Wilson score only controls sort order. A 3-0 ally still says "100%" on the card, but sorts below 15-4 (79%) because the lower bound with 19 games beats the lower bound with 3.

[Reddit uses it](https://redditblog.com/2009/10/15/blog-whats-hot-algorithm-how-we-made-it/) for ranking comments. The problem is always the same: sort by a rate when sample sizes vary. The lower bound of a confidence interval is a clean answer.
