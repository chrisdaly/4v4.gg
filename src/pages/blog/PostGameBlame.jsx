import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CountryFlag } from "../../components/ui";
import data from "../../lib/data/postGameBlame.json";
import "../../styles/pages/Blog.css";
import "../../styles/pages/blog/PostGameBlame.css";

/**
 * Blog post: who says what in chat in the five minutes after a 4v4.
 *
 * The argument: after a loss the blame comes from the top. The top scorer on
 * the losing team blames most, the blame goes to a teammate and lands on
 * anyone, and the player who did least says least.
 *
 * Counts come from postGameBlame.json (built by pgb_build.py). "Seat" is a
 * player's place on their own team by rating going in. A player's place in
 * the game (1 to 8) is by the site's MVP score, the same one behind the MVP
 * badge on match pages (preprocessPlayerScores in lib/utils.js). Blame, praise and sorry are word
 * lists, so the figures are rough and the prose rounds them.
 */

const { stats: S, cards: C } = data;

const BLUE = "var(--team-blue)";
const RED = "var(--red)";
const teamColor = (p) => (p.won ? BLUE : RED);

/**
 * One game, drawn like the site's team MMR chart: rating up the side, the
 * winners' column on the left and the losers' on the right, a thin line
 * joining each team. A bar runs out from each dot and its length is that
 * player's MVP score out of 40, with the score at its end.
 *
 * Players who spoke are full strength, ringed and named. Players the chat
 * names (the ones being blamed or thanked) are named too, without the ring.
 * The rest sit back. `hot` is the speaker being pointed at in the chat, who
 * stays lit while the other speakers sit back.
 */
function KillChart({ players, speakers, named, hot, onHot }) {
  const W = 304;
  const H = 200;
  const COLS = [141, 163];
  const rated = players.filter((p) => p.mmr > 0);
  const lo = Math.min(...rated.map((p) => p.mmr)) - 60;
  const hi = Math.max(...rated.map((p) => p.mmr)) + 60;
  const y = (m) => 166 - ((m - lo) * 152) / (hi - lo);
  // Players at nearly the same rating are nudged down so their bars do not overlap
  const rows = [];
  [true, false].forEach((won) => {
    let last = -99;
    rated
      .filter((p) => p.won === won)
      .sort((a, b) => b.mmr - a.mmr)
      .forEach((p) => {
        const v = Math.max(y(p.mmr), last + 12);
        last = v;
        rows.push({ p, x: won ? COLS[0] : COLS[1], y: v, on: speakers.has(p.tag), told: named.has(p.tag) });
      });
  });
  const spine = (won) => rows.filter((r) => r.p.won === won).map((r) => `${r.x},${r.y.toFixed(1)}`).join(" ");
  const mid = (COLS[0] + COLS[1]) / 2;
  return (
    <svg
      className={`pb-chart${hot ? " pb-chart--picked" : ""}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Rating and MVP score for the eight players. ${rows.filter((r) => r.on).map((r) => `${r.p.name}: ${r.p.won ? "won" : "lost"}, ${r.p.mmr} MMR, MVP score ${r.p.pts} of 40`).join(". ")}.`}
    >
      <line x1={mid} y1="2" x2={mid} y2={H - 14} className="pb-chart-mid" />
      <polyline points={spine(true)} fill="none" stroke={BLUE} strokeWidth="1" opacity="0.5" />
      <polyline points={spine(false)} fill="none" stroke={RED} strokeWidth="1" opacity="0.5" />
      <text x={COLS[0]} y={H - 3} textAnchor="middle" className="pb-t">won</text>
      <text x={COLS[1]} y={H - 3} textAnchor="middle" className="pb-t">lost</text>
      {[...rows].sort((a, b) => a.on - b.on).map(({ p, x, y: yy, on, told }) => {
        const d = p.won ? -1 : 1;
        const len = (56 * p.pts) / 40;
        const bx = x + d * 7;
        const label = on || told ? (d < 0 ? `${p.name} ${p.pts}` : `${p.pts} ${p.name}`) : String(p.pts);
        return (
          <g
            key={p.tag}
            className={`pb-row${on ? " pb-row--spoke" : ""}${told && !on ? " pb-row--named" : ""}${hot === p.tag ? " pb-row--hot" : ""}`}
            onMouseEnter={on ? () => onHot(p.tag) : undefined}
            onMouseLeave={on ? () => onHot(null) : undefined}
          >
            <title>{`${p.name}: ${p.won ? "won" : "lost"}, ${p.mmr} MMR, MVP score ${p.pts} of 40, ${p.kills} units killed`}</title>
            <rect x={d > 0 ? bx : bx - len} y={yy - 4} width={len} height="8" rx="2" fill={teamColor(p)} />
            <circle cx={x} cy={yy} r="4.5" fill={teamColor(p)} stroke={on ? "#fff" : "none"} strokeWidth="1.5" />
            <text x={bx + d * (len + 4)} y={yy + 3.6} textAnchor={d < 0 ? "end" : "start"} className={`pb-t${on ? " pb-t--name" : ""}${told && !on ? " pb-t--told" : ""}`}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The numbered dot beside a name: the player's place in the game by MVP score, in their team's colour. */
function Place({ p }) {
  return (
    <svg className="pb-place" viewBox="0 0 22 22" role="img" aria-label={`${p.rank} of 8 by MVP score`}>
      <circle cx="11" cy="11" r="9.5" fill={teamColor(p)} stroke="#fff" strokeWidth="1.5" />
      <text x="11" y="14.8" textAnchor="middle" className="pb-place-n">{p.rank}</text>
    </svg>
  );
}

/**
 * A stretch of chat after one game, with the game drawn beside it.
 * Consecutive lines by the same player share one header. Pointing at a
 * player's lines lights their bar in the chart, and the other way round.
 */
function Exchange({ id }) {
  const card = C[id];
  const [hot, setHot] = useState(null);
  const turns = [];
  card.lines.forEach((l) => {
    const last = turns[turns.length - 1];
    if (last && last.tag === l.tag) last.texts.push(l.text);
    else turns.push({ ...l, texts: [l.text], first: !turns.some((t) => t.tag === l.tag) });
  });
  const speakers = new Set(card.lines.map((l) => l.tag));
  // Players the chat names: the ones being blamed or thanked
  const said = card.lines.map((l) => l.text.toLowerCase()).join("\n");
  const named = new Set((card.players || []).filter((p) => p.name.length >= 3 && said.includes(p.name.toLowerCase())).map((p) => p.tag));
  // ...and the ones it names by a nickname the match data does not know ("bong" for bongzilla)
  (card.also || []).forEach((tag) => named.add(tag));
  return (
    <div className="pb-card">
      <div className="pb-lines">
        {turns.map((t, i) => (
          <div
            key={i}
            className={`pb-turn${hot === t.tag ? " pb-turn--hot" : ""}`}
            onMouseEnter={() => setHot(t.tag)}
            onMouseLeave={() => setHot(null)}
          >
            <div className="pb-who">
              {t.avatar && <img className="pb-avatar" src={t.avatar} alt="" loading="lazy" />}
              <Link className="pb-name" to={`/player/${encodeURIComponent(t.tag)}`}>{t.name}</Link>
              {t.country && <CountryFlag name={t.country} />}
              {t.rank && <Place p={t} />}
              {t.first && t.rank && <span className="pb-role">{t.won ? "won" : "lost"} &middot; {t.rank === 1 ? "MVP, " : ""}score {t.pts} &middot; {t.mmr} MMR</span>}
            </div>
            {t.texts.map((x, j) => <span className="pb-quote" key={j}>{x}</span>)}
          </div>
        ))}
        <span className="pb-after">{card.map ? `${card.map}, ${card.minutes} minutes.` : card.after}{card.note ? ` ${card.note}` : ""}</span>
      </div>
      {card.players && (
        <figure className="pb-fig">
          <KillChart players={card.players} speakers={speakers} named={named} hot={hot} onHot={setHot} />
        </figure>
      )}
    </div>
  );
}

/** Two bars per row on one 0 to 30% scale, so winners and losers can be read against each other. */
function Mirror({ rows }) {
  const w = (v) => `${(100 * v) / 30}%`;
  return (
    <div className="pb-mirror" role="img" title="Share of the games where they say anything" aria-label={rows.map((r) => `${r.label}: blames ${r.blame}%, praises ${r.praise}%`).join(". ")}>
      {rows.map((r) => (
        <div className="pb-mirror-row" key={r.label}>
          <span className="pb-mirror-label">{r.label}</span>
          <span className="pb-mirror-bars">
            <span className="pb-bar pb-bar--blame" style={{ width: w(r.blame) }}><span>{Math.round(r.blame)}% blame</span></span>
            <span className="pb-bar pb-bar--praise" style={{ width: w(r.praise) }}><span>{Math.round(r.praise)}% praise</span></span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PostGameBlame() {
    return (
    <article className="bl-content bl-section pb-article">
      <Link to="/blog" className="bl-back">&larr; Blog</Link>
      <div className="bl-card-tags pb-tags">
        <span className="bl-card-tag">chat</span>
        <span className="bl-card-tag">stats</span>
      </div>
      <h1 className="bl-article-title">The Blame Game</h1>
      <div className="pb-date"><span className="bl-card-tag">Draft</span></div>

      <p className="pb-lede">
        A long game has just ended. The players are back in the chat,
        searching for the next one. The best player on the losing team is
        pissed off. Somebody lost that game, and they are sure it was not
        them. Another kind of game begins. The blame game.
      </p>

      <Exchange id="tod" />
      <p className="pb-key-line">
        Winners on the left, losers on the right, higher rated at the top.
        Each bar is a player&rsquo;s MVP score out of 40, built from the
        score screen. Ringed players are the ones talking.
      </p>

      <p>
        The five minutes after a 4v4 are a trial held in public. The
        gallery is whoever else is in the chat, waiting for the next game
        and glad of the drama. After a loss there is an accusation,
        evidence, a defence, now and then a confession, and no judge.
      </p>

      <p>
        I counted what was said in the five minutes after{" "}
        {S.games.toLocaleString()} games. Someone blames someone after one
        game in six. Losers blame twice as often as winners, and winners
        praise twice as often as losers.
      </p>

      <Mirror
        rows={[
          { label: "Winners", blame: S.winners.blame, praise: S.winners.praise },
          { label: "Losers", blame: S.losers.blame, praise: S.losers.praise },
        ]}
      />
      <p className="pb-key-line">
        Of the games where a winner or a loser speaks, the share where they
        blame or praise someone. Nearly half of the praise is a gg.
      </p>

      <h2>The accusation</h2>

      <p>
        Two numbers follow every player into the chat. Their rating, or
        MMR, is how good the ladder thinks they are before the game starts.
        Their score is how well they played in it, ranked against the other
        seven on kills, experience, gold and army size.
      </p>

      <p>
        On a losing team, the accusation comes most often from the player
        who did best. The top scorer blames twice as often as the bottom
        scorer. The highest-rated player blames more than the rest of the
        team too.
      </p>

      <p>
        Sometimes the accuser gets in first. On Sanctuary, GoGuma had the
        highest rating in the game, tied for the lowest score, and blamed
        Onslaught before anyone else typed.
      </p>

      <Exchange id="value" />

      <h2>The evidence</h2>

      <p>
        Warcraft III ends every game on a score screen, and players reach
        for it as evidence. Nobody reaches for it more than ToD, who posted
        links to finished games 62 times in nine months of chat. In
        February a former teammate asked the chat whether ToD was still
        griefing. ToD answered with the score.
      </p>

      <Exchange id="scoreboard" />

      <p>
        Both have a point. The score screen has no column for a teammate
        left to fight one against two. Neither does the MVP score in the
        charts on this page, which is built from the same columns.
      </p>

      <h2>The defence</h2>

      <p>
        The accused rarely agree, and the usual defence is luck. On
        Deadlock, Capybara and Sportsgamblr had lost a game together
        earlier that night. This time they were on opposite sides, and
        Sportsgamblr lost and typed first.
      </p>

      <Exchange id="pileon" />

      <h2>The confessions</h2>

      <p>
        It is not always the blame game. The lowest-rated player on a
        winning team praises most, though sometimes the praise has to be
        asked for. On Lilious, Coldbringer was the lowest-rated winner and
        the top scorer in the game.
      </p>

      <Exchange id="thankme" />

      <p>
        Hardly anyone blames themselves. An apology turns up after fewer
        than one game in fifty, most often from the lowest-rated loser.
      </p>

      <Exchange id="sorry" />

      <p>
        A winner can own up too. On Lilious again, olobor had blamed
        BiGToBi the game before, and this time BiGToBi outscored them.
      </p>

      <Exchange id="honest" />

      <h2>The verdict</h2>

      <p>
        So why blame anyone? The blame game is played for one person, the
        one typing. Psychologists call it self-serving bias: the win was
        mine, the loss was yours. The top scorer has a case and the
        highest-rated player has a reputation, so those two blame most.
      </p>

      <p>
        Everyone else pays for it. Blame sours the team it is aimed at, but
        the bigger cost is outside the team, because the player base is
        small. About 2,400 people played 4v4 this season. Almost half the
        blame comes from forty-five of them. One time in three, a player
        who blames a teammate and queues again meets that teammate in the
        next game. On Nightopia the lowest-rated player in the game told
        the veterans that the game needs its new players.
      </p>

      <Exchange id="archers" />

      <p>
        Timothy Gallwey, a tennis coach, wrote about the frustration of
        being beaten. His answer was to treat the opponent as a kind of
        friend. The player who wins shows the loser exactly what they
        cannot do yet, and that is the obstacle they need in order to get
        better. Frustration turns into something closer to gratitude.
      </p>

      <p>
        A 4v4 supplies more obstacles than tennis, and three of them are
        teammates. A player has to work out what three strangers are
        trying to do, help them when they get attacked, and keep their
        temper when the plan falls apart. Teamwork is a skill like any
        other. The blame game is what failing at it looks like.
      </p>

      <p>
        Among the best 4v4 players, the ones who also play a lot of 1v1
        blame about half as often. In a 1v1 there is nobody to lean on and
        nobody to blame.
      </p>

      <p>
        Nobody loses a 4v4 alone. Four players lost that game, and four
        others beat them. Of the eight, the only one a player can change is
        themselves.
      </p>

      <p className="pb-foot">
        Season 25: {S.games.toLocaleString()} games of 4v4 and the chat in
        the five minutes after each. Blame, praise and sorry are counted
        with word lists: about four in five lines flagged as blame are
        blame, and the other lists are rougher. The MVP score is this
        site&rsquo;s: five score-screen columns ranked among the eight and
        added. Figures by score come from a sample of{" "}
        {S.scoreboard.games.toLocaleString()} games, so read the gaps as
        direction. The 1v1 comparison covers 4v4 players rated
        1900 and up: 20 who played 50 or more 1v1 games against 37 who
        played none. It is a correlation and is weaker or reversed at lower
        ratings. The exchanges are excerpts, and a name in square brackets
        replaces a nickname.
      </p>
    </article>
  );
}
