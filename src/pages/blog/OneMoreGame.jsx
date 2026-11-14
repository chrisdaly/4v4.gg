import React from "react";
import { Link } from "react-router-dom";
import { Dot } from "../../components/ui";
import data from "../../lib/data/oneMoreGame.json";
import "../../styles/pages/Blog.css";
import "../../styles/pages/blog/OneMoreGame.css";

/**
 * Blog post: what happens after someone in chat says "last game".
 *
 * The argument: "last game" is a promise to stop and a call to search, said to
 * a chat that always wants another game. Three sections: when it is said (early
 * it holds, deep into a session it does not), what the player wants (to end on
 * a win), and who is listening (the chat, which never closes).
 *
 * Counts and cards come from oneMoreGame.json. "Played on" means another game
 * started within two hours of the previous one ending; a longer break is a new
 * session. A few ladder-wide figures in the prose are written out by hand.
 */

const { promises: P } = data;
// of the 31 who lost the "last game": how many played on, and how many of those finished the session on a win
const LOST_ON = "Twelve";
const LOST_ON_WIN = "eight";

/** What came after the session, where the games say something the dots can't. */
const LATER = {
  "volumeǃone|ok last game": "Back in a game by lunchtime.",
};

/** What the player went and did in the gap before coming back, where they said so. */
const ERRAND = {
  Lacoste: "Got the kebab.",
};

/** What happened, in words, built from the same games the dots show. */
function outcome(q) {
  const n = q.before.length;
  const depth = n === 0 ? "First game of the session." : `${n} ${n === 1 ? "game" : "games"} in.`;
  const k = q.after.length;
  const wins = q.after.filter(Boolean).length;
  // minutes between the game they called the last and the next one
  const gap = k > 0 ? Math.round(q.games[n + 1].s - q.games[n].e) : 0;
  const errand = ERRAND[q.name] ? `${ERRAND[q.name]} ` : "";
  const lead = gap >= 60 ? `${errand}Back after ${gap} minutes. Played` : "Played";
  const then = k === 0 ? "Stopped." : k === 1 ? `${lead} 1 more and ${wins ? "won" : "lost"} it.` : `${lead} ${k} more and won ${wins}.`;
  // clock times only where the player kept going: when they said it and when they finally stopped
  const end = k > 0 && q.localTime && q.endLocal ? ` Said at ${q.localTime}, finished at ${q.endLocal}.` : "";
  const note = LATER[`${q.name}|${q.text}`];
  const later = note ? ` ${note}` : "";
  return `${depth} ${q.promised ? "Won the last game." : "Lost the last game."} ${then}${end}${later}`;
}

/**
 * The night as a row of dots, one per game in order. The gold speech bubble sits where
 * they said it: everything left of it was already played, the first dot to the
 * right is the game they called the last.
 */
function Night({ q }) {
  return (
    <div className="og-session" aria-hidden="true">
      {q.before.map((w, i) => <Dot key={`b${i}`} $win={!!w} $size={10} $recent />)}
      <svg className="og-said" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 1.5h12a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H8.2L4.5 14.8v-3.3H2A1.5 1.5 0 0 1 .5 10V3A1.5 1.5 0 0 1 2 1.5z" />
      </svg>
      <Dot $win={!!q.promised} $size={10} $recent />
      {q.after.map((w, i) => <Dot key={`a${i}`} $win={!!w} $size={10} $recent />)}
    </div>
  );
}

/** One promise with the night around it. */
function PromiseCard({ q }) {
  const said = outcome(q);
  return (
    <li>
      <div className="og-who">
        {q.avatar && <img className="og-avatar" src={q.avatar} alt="" loading="lazy" />}
        <Link className="og-name" to={`/player/${encodeURIComponent(q.tag)}`}>{q.name}</Link>
      </div>
      <span className="og-quote">{q.text}</span>
      {q.then && <span className="og-quote og-quote--then">{q.then}</span>}
      <Night q={q} />
      <span className="og-after">{said}</span>
    </li>
  );
}

/** A card's data by "name" or "name|part of the quote" (one player can have two). */
function pick(key) {
  const [name, needle] = key.split("|");
  return data.quotes.find((x) => x.name === name && (!needle || x.text.includes(needle)));
}

/** A speaker's avatar and name, linked to their profile when we know who they are. */
function Speaker({ name }) {
  const who = data.people[name];
  if (!who) return <span className="og-name">{name}</span>;
  return (
    <>
      {who.avatar && <img className="og-avatar" src={who.avatar} alt="" loading="lazy" />}
      <Link className="og-name" to={`/player/${encodeURIComponent(who.tag)}`}>{name}</Link>
    </>
  );
}

/**
 * A stretch of chat with more than one speaker, then the session it happened
 * in. `rows` are [speaker, line, optional translation]; consecutive lines by
 * the same speaker share one name.
 */
function Exchange({ rows, q, after }) {
  const said = after || outcome(q);
  return (
    <ul className="og-quotes">
      <li>
        {rows.map(([who, line, gloss], i) => who === null ? (
          <span className="og-gloss og-aside" key={i}>{line}</span>
        ) : (
          <React.Fragment key={i}>
            {(i === 0 || rows[i - 1][0] !== who) && (
              <div className="og-who og-who--turn"><Speaker name={who} /></div>
            )}
            <span className="og-quote">
              {line}
              {gloss && <span className="og-gloss og-gloss--inline">{gloss}</span>}
            </span>
          </React.Fragment>
        ))}
        <Night q={q} />
        <span className="og-after">{said}</span>
      </li>
    </ul>
  );
}

/** The cards for the named players, in the order given. */
function Cards({ names }) {
  return (
    <ul className="og-quotes">
      {names.map((key) => <PromiseCard key={key} q={pick(key)} />)}
    </ul>
  );
}

export default function OneMoreGame() {
  return (
    <article className="bl-content bl-section og-article">
      <Link to="/blog" className="bl-back">&larr; Blog</Link>
      <div className="bl-card-tags og-tags">
        <span className="bl-card-tag">chat</span>
        <span className="bl-card-tag">stats</span>
      </div>
      <h1 className="bl-article-title">Just One More Game</h1>
      <div className="og-date"><span className="bl-card-tag">November 2026</span></div>

      <p className="og-lede">
        One in the morning. In the chat where Warcraft III 4v4 players look
        for games, someone says goodnight. Someone else is twenty-seven
        games into a session.
      </p>

      <Exchange
        q={pick("Boyzinho")}
        after="27 games in. Said at 00:59, finished at 02:36."
        rows={[
          ["mubarak", "ok gn8 folks <3"],
          ["Boyzinho", "+1"],
          ["Boyzinho", "last one"],
          ["Boyzinho", "gogog"],
        ]}
      />
      <p className="og-key-line">
        Each dot is a game that session, green for a win and red for a loss.
        The speech bubble is where they said &ldquo;last game&rdquo;, and
        the first dot after the bubble is that game. Times are the
        player&rsquo;s own.
      </p>

      <p>
        Boyzinho lost that game. Then they played four more.
      </p>

      <p>
        &ldquo;Last game&rdquo; is two things at once: a promise to stop
        and a call to search. It is said to the whole chat, and the chat
        always wants another game. A 4v4 needs eight players and takes
        about twenty minutes.
      </p>

      <p>
        Skiers have a superstition about this. Nobody says &ldquo;last
        run&rdquo;, because that is the run where people get hurt. They say
        &ldquo;two more, skip the last&rdquo;. Gamers have no such rule.
        Nobody breaks a leg at 4am. A tired skier pays on the hill. A tired
        gamer pays in the morning, short on sleep, down on MMR and still
        tilted. So gamers say &ldquo;last game&rdquo; all the time.
      </p>

      <p>
        In nine months of chat I found {P.total} promises to play just one
        more game. Half the time, whoever got that game played another
        game after it. Most of them were in the next game within ten
        minutes.
      </p>

      <h2>Squeezing a game in, or one more hit</h2>

      <p>
        Early in a session the promise usually holds. Someone who says
        &ldquo;last game&rdquo; that early usually has somewhere to be, even
        if only bed, and is trying to squeeze one game in first. The day
        still has a claim on them. If the others search fast, the game gets
        played in time. When the promise comes fewer than three games in,
        three in four stop.
      </p>

      <Cards names={["PIZZA"]} />

      <p>
        Deep into a session, things are different. By then nothing outside
        the game is asking for the player. There is nowhere to be and no
        responsibilities. Seven or more games in, three in four play on, and
        the promise is the kind an addict makes: meant, and not kept.
      </p>

      <Cards names={["Sportsgamblr|kraft"]} />

      <p>
        Some things do end a session. The gym does. Food is only a pause.
      </p>

      <Cards names={["Lacoste"]} />

      <h2>Ending on a win</h2>

      <p>
        Everyone says they want to end on a win. Nobody wants the last thing
        they did today to be a loss.
      </p>

      <Cards names={["KODOFORSAKEN"]} />

      <p>
        The wish shows most in long sessions. Players in them win half
        their games, and still end on a win 58% of the time.
      </p>

      <Exchange
        q={pick("GoGuma")}
        rows={[
          ["GoGuma", "b4 sleeping"],
          ["GoGuma", "last game"],
          ["ToD", "u wanna have nightmares?"],
          ["GoGuma", "haha"],
          ["GoGuma", "already"],
          ["GoGuma", "did"],
        ]}
      />

      <p>
        Lose the last game and some cannot leave on that loss. {LOST_ON}{" "}
        who lost theirs played on, and {LOST_ON_WIN} of them stopped on a
        win.
      </p>

      <Cards names={["Shocker"]} />

      <p>
        Most do leave on the loss, though nobody means to. Tilt only
        carries a player so far. Eventually they have had enough.
      </p>

      <Cards names={["volumeǃone|ok last game"]} />

      <h2>No last call</h2>

      <p>
        The chat has a say too. The chat is a bar late at night, and nobody
        wants to see anyone leave. A room that wants you in it is hard to
        walk out of. At ten to five on a Moscow morning, MOCKBA called the
        last game.
      </p>

      <Exchange
        q={pick("MOCKBA")}
        rows={[
          ["MOCKBA", "last game and sleep )"],
          ["era", "russians dont sleep"],
          ["MOCKBA", "Moscow never sleep )"],
          [null, "Twenty minutes later they had won it:"],
          ["MOCKBA", "1 more ?"],
          ["MOCKBA", "gn all"],
          ["MOCKBA", "no game ("],
          ["era", "dont go night night mock"],
          ["MOCKBA", "ok 3 min"],
          ["MOCKBA", "search"],
        ]}
      />

      <p>
        &ldquo;Last game&rdquo; is many things. A promise to the self that
        has work in the morning. A lie to the self that doesn&rsquo;t care.
        A bargain with the game: one win and I go. An invitation to
        everyone else. At 4am everyone listening knows which of those they
        are hearing, and is glad to hear it. A bar at least has a last
        call. The chat never does. Somewhere it is always early evening,
        and someone is just logging on.
      </p>

      <p className="og-foot">
        Chat from Feb 8 to Nov 13 2026: {P.total} promises from {P.people}{" "}
        people, each read in context. {P.noGame} never got their game; of
        the {P.matched} that did, {P.again} played again within two hours,
        29 of them within ten minutes.
        Said fewer than three games in: {P.depth[0].again} of {P.depth[0].n}{" "}
        played on. Seven or more in: {P.depth[2].again} of {P.depth[2].n}.
        The groups are small, so read the gaps as direction. The long-session figure
        is from 58,335 sessions of 4v4 in season 25, counting sessions of
        sixteen games or more.
      </p>
    </article>
  );
}
