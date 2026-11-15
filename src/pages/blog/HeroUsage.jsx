import React from "react";
import { Link } from "react-router-dom";
import HeroModeSplit from "../../components/HeroModeSplit";
import DemonHunterKit from "../../components/DemonHunterKit";
import people from "../../lib/data/demonHunterPeople.json";
import "../../styles/pages/Blog.css";
import "../../styles/pages/blog/DemonHunter.css";

/**
 * Blog post: where the Demon Hunter, Night Elf's hero in solo, went in 4v4.
 *
 * The story: the chat calls opening DH "brain rot"; his kit explains why (one
 * mana bar among many, an evasion spells ignore); the Keeper and the aura
 * heroes take his place; and the DH that survives lives where a 4v4 still
 * looks like solo, the corner spawn and the first minutes, where it is a 1v1
 * or a 2v2. Once the game becomes a 4v4 he is a dead hero.
 *
 * The corner-spawn claim is the players' own, quoted, not measured: the relay
 * does not record spawn position, and replays cover too few games to infer it.
 *
 * Chat exchanges are quoted as typed, chosen after reading the lines around
 * them; a narrator's aside marks any gap of more than a few minutes. French is
 * glossed. Two sections: why he disappears, and where he still works.
 *
 * Every number is a share of picks or player slots, never of games, from a
 * stride across season 25 (heroModeSplit.json). Per-race hero shares (62% /
 * 16% DH, 29% / 64% Keeper) were computed with the same stride and back-check
 * against that file to within a point. Nothing claims a pick order: the API
 * sorts heroes by XP, not by when they were built.
 */

/** A speaker's avatar and name, linked to their profile. */
function Speaker({ name }) {
  const who = people[name];
  if (!who) return <span className="dw-name">{name}</span>;
  return (
    <>
      {who.avatar && <img className="dw-avatar" src={who.avatar} alt="" loading="lazy" />}
      <Link className="dw-name" to={`/player/${encodeURIComponent(who.tag)}`}>{name}</Link>
    </>
  );
}

/**
 * A stretch of chat. `rows` are [speaker, line, optional translation];
 * consecutive lines by the same speaker share one name. A null speaker is a
 * narrator's aside. `when` is the date under the exchange.
 */
function Exchange({ rows, when }) {
  return (
    <div className="dw-exchange">
      {rows.map(([who, line, gloss], i) =>
        who === null ? (
          <span className="dw-aside" key={i}>{line}</span>
        ) : (
          <React.Fragment key={i}>
            {(i === 0 || rows[i - 1][0] !== who) && (
              <div className="dw-who">
                <Speaker name={who} />
              </div>
            )}
            <span className="dw-quote">{line}</span>
            {gloss && <span className="dw-gloss">{gloss}</span>}
          </React.Fragment>
        )
      )}
      {when && <span className="dw-when">{when}</span>}
    </div>
  );
}

export default function HeroUsage() {
  return (
    <article className="bl-content bl-section dw-article">
      <Link to="/blog" className="bl-back">&larr; Blog</Link>
      <div className="bl-card-tags dw-tags">
        <span className="bl-card-tag">heroes</span>
        <span className="bl-card-tag">chat</span>
        <span className="bl-card-tag">stats</span>
      </div>
      <h1 className="bl-article-title">Where the Demon Hunter Went</h1>
      <div className="dw-date"><span className="bl-card-tag">November 2026</span></div>

      <p className="dw-lede">
        In solo, Night Elf is built around the Demon Hunter, in 4v4 opening
        with him gets you called names.
      </p>

      <Exchange
        when="Aug 5"
        rows={[
          ["ToD", "galen going dh 1st"],
          ["ToD", "in 4v4"],
          ["ToD", "total brain rot"],
          [null, "Eight minutes later:"],
          ["undeadfaraz", "What is bad going DH first?"],
          ["wonderwood", "in 4s his tankiness is diminished, and mana burn is less impactful when theres many heroes"],
          ["wonderwood", "auras usually better"],
          ["wonderwood", "he just doesnt scale the same"],
        ]}
      />

      <p>
        Most NE players agree with ToD. Only 16% of them pick a DH in 4v4,
        against 62% in solo, the biggest drop of any hero, and the chat has
        a name for him.
      </p>

      <Exchange
        when="Nov 1"
        rows={[
          ["ToD", "et dh ... completement naze", "And DH... completely useless."],
          ["Mellow", "mais oui DH bears c'est vrmt de la merde je confirme", "Yeah, DH bears really is crap, I confirm."],
          ["Apm50", "dh=dead hero Kappa"],
          ["ToD", "yep"],
        ]}
      />

      <h2>Why he disappears</h2>

      <p>
        Some of it is his abilities. Most are built for a fight against one
        other hero, and in 4v4 the other team brings around nine, out of a
        possible twelve.
      </p>

      <DemonHunterKit />

      <p>
        Some of it is the map. In solo the DH does a bit of everything: he
        tanks, deals damage, burns the enemy hero&rsquo;s mana and stops
        him creeping. In 4v4 the maps are bigger, with more camps and more
        expos, so the player he&rsquo;s chasing creeps somewhere else, or
        an ally comes to help. By the time the armies meet, the
        fights are huge and he&rsquo;s the first hero they focus.
      </p>

      <Exchange
        when="Apr 3"
        rows={[
          ["RONALDO", "dh good idea"],
          ["Boyzinho", "dh good in small maps"],
          ["RONALDO", "meybe"],
          ["Boyzinho", "in big maps that people usually go 60 70 food"],
          ["Boyzinho", "dh is ez target"],
          ["Boyzinho", "hex"],
          ["Boyzinho", "stun"],
          ["Boyzinho", "focus"],
        ]}
      />

      <p>
        And NE has heroes that usually suit 4v4 better. 4v4 rewards auras and range: an aura
        that helps one player in solo helps four, and a ranged hero can
        fight from behind the army. The Keeper and the Priestess have both,
        so the NE altar makes a Keeper instead, in 64% of NE slots against
        29% in solo, and the Priestess goes from about one NE in ten to
        nearly half. Every aura and healing hero rises the same way.
      </p>

      <HeroModeSplit />

      <p>
        The Keeper also levels better. Heroes nearby split the experience
        from a kill, so a player with one hero gets all of it, and a Keeper
        can be your only hero: his treants creep fast and, with Entangle,
        harass and win skirmishes, and he fights from a distance instead of
        in the middle of it. A lone Keeper reaches level 6 and Tranquility,
        which heals the whole army, in about a quarter of 4v4 games. A lone
        DH reaches Metamorphosis in about one in seven.
      </p>

      <p>
        And the DH can&rsquo;t keep himself alive. A hero in melee range of
        four opponents needs a Holy Light or a Healing Wave behind him, and
        NE has neither. A DH on his own has to carry his survival: a Town
        Portal, a Staff of Preservation, boots, an Orb of Venom, an
        invulnerability potion, maybe an anti-magic potion. That&rsquo;s
        all six slots, before any of the good items he picks up creeping.
        So he often needs a second hero, to carry items and to staff him
        out when he&rsquo;s caught, and a second hero splits his
        experience, which puts Metamorphosis further away.
      </p>

      <h2>Where he still works</h2>

      <p>
        A 4v4 doesn&rsquo;t start as a 4v4. For the first few minutes
        it&rsquo;s four separate games, and a player in the corner spawn,
        close to the enemy, is playing something near solo. Galen, the
        player ToD was calling brain rot, made that case after the game.
      </p>

      <Exchange
        when="Aug 5, 82 minutes later"
        rows={[
          ["Galen", "well Tod in that game, i knew you would have kotg and potm so what point is there in me going kotg/potm also, when in the team fights we would have the auras and in the 2v2 dh can fight well after 3"],
          ["Galen", "2 kotg is stupid"],
          ["EGMoon", "using dh in 4v4 is the stupid thing there, tod is right, u only be usefull on early game, and be useless mid/late game"],
        ]}
      />

      <p>
        The players who rate him agree on when: the corner, the harass, the
        first fight. mubarak had just harassed Lakers out of a game.
      </p>

      <Exchange
        when="Mar 1, after the game"
        rows={[
          ["mubarak", "yeah lakers i give u advice in that map as elf"],
          ["mubarak", "get dh in corner its better"],
          ["mubarak", "and tree creep the small camp with 2 level 3s and the ogre with item"],
          ["mubarak", "ur archer and aow can lower them b4 ur hero comes out"],
          ["mubarak", "so u are rdy for a herass"],
          ["Lakers", "dh i like"],
          ["Lakers", "but can be hard in 4s"],
        ]}
      />

      <p>
        After that window he needs the right opponents. Mana Burn barely
        dents most of the nine heroes across from him, but some of them
        feel it.
      </p>

      <Exchange
        when="Mar 25"
        rows={[
          ["JeeF", "was suprised you harrasing with dh tbh"],
          ["Sabbatical", "dh so useless after minute 8"],
          ["Sabbatical", "just wastes your micro moving it back while it does 0 damange and gets 2-3 mana burns in"],
          ["mubarak", "trust me dh is good vs orc heroes"],
          ["mubarak", "and kotg"],
        ]}
      />

      <p>
        And his team has to commit to him: an ally with a heal.
        They&rsquo;re keeping alive a
        hero all four opponents want dead.
      </p>

      <Exchange
        when="Nov 2"
        rows={[
          ["criver", "i was playing pala lv1 rpg for 2min"],
          ["Mellow", "pala was the best choice in this situation, for sustain"],
          ["Scorch", "my dh would have been dead a few times if it weren't for the heals"],
        ]}
      />

      <Exchange
        when="May 12"
        rows={[
          ["Lynfan", "every elf pro plays dh in solo,maybe dh is not bad in 4s"],
          ["Lynfan", "dh need a  pladin or sh to heal him"],
          ["fuetti", "jens made dh work in 4v4"],
          ["fuetti", "but its jens"],
          ["SHIP", "theres just not much space u can make with dh compared to warden or bm"],
          ["SHIP", "and kotg outclass dh lvl6 with tranq"],
        ]}
      />

      <p>
        That&rsquo;s a narrow set of games: the right spawn, the right
        opponents, an ally with a heal. It&rsquo;s also a set nobody has
        finished mapping.
      </p>

      <p>
        Solo has had twenty years of pros
        working out the DH&rsquo;s timings, and 4v4 has had a chat room.
        Nobody has worked out in public which spawns, which maps or which enemy
        heroes make him worth the slot, or when a level-3 DH should leave
        the corner on a map twice the size.
      </p>

      <p>
        Jens is the hint. Even in solo he picks the DH less than half as
        often as other NE players, and in 4v4 he picks him in about 16% of
        his NE games, the same as everyone else. fuetti still says he made
        him work. If one of the best NE players on the ladder can get that
        out of a hero he barely picks, there&rsquo;s a 4v4 DH still waiting
        to be found, and the timings to go with him.
      </p>

      <p className="dw-foot">
        Picks are from season 25, Europe: 11,000 solo games against 11,000
        of 4v4, 236,000 hero picks, about nine heroes per 4v4 team.
        Shares are of NE player slots, so a DH appears in more games than
        the 16% suggests: 23% of 4v4 games have one somewhere, against 29%
        of solo games. Hero levels are from 600 recent 4v4 games: a Keeper
        ends at level 6 or higher in 14% of picks (27% when he&rsquo;s the
        player&rsquo;s only hero), a DH in 7% (14%). Pick rate isn&rsquo;t strength: the ladder matches on
        MMR, so every race wins close to half its games. Where players
        spawned isn&rsquo;t recorded, so the corner-spawn pattern is the
        players&rsquo; account, not a measurement. Jens&rsquo;s figure is
        from Jens#11592: the 105 of his 4v4 games that carry hero data and
        rolled NE (in 4v4 he queues as Random). The DH comes up in about 440
        chat messages between February and November 2026.
      </p>
    </article>
  );
}
