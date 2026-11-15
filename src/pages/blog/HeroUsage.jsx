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
        In solo, 62% of NE players choose a DH, in 4v4 only 16% do. No
        hero&rsquo;s pick rate falls further between the two modes.
      </p>

      <h2>Why he disappears</h2>

      <p>
        Some of it is his kit. Most of it is built for a fight against one
        other hero, and in 4v4 the other team brings around nine, out of a
        possible twelve.
      </p>

      <DemonHunterKit />

      <p>
        Some of it is the map. In solo the DH&rsquo;s job is pressure: harass
        early, burn the enemy hero&rsquo;s mana, stop him creeping. 4v4 maps
        are bigger, with more camps and more expos, so the player he&rsquo;s
        chasing creeps somewhere else, or three allies come and help. By
        the time the armies meet, the fights are huge and he&rsquo;s the
        easiest hero on the field to catch.
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
        Some of it is what his team would rather have. An aura that helps
        one player in solo helps four in 4v4, so the NE altar makes a Keeper
        of the Grove instead, in 64% of NE slots against 29% in solo, and
        the Priestess goes from about one NE in ten to nearly half. Every
        aura and healing hero rises the same way.
      </p>

      <HeroModeSplit />

      <p>
        And NE can&rsquo;t heal him. A hero who lives in melee range of
        four opponents needs a Holy Light or a Healing Wave behind him, and
        NE has neither. Its big heal is the Keeper&rsquo;s ultimate, which
        is the other reason the Keeper gets picked.
      </p>

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
        And he needs a healer, which has to come from an ally.
      </p>

      <Exchange
        when="Nov 2"
        rows={[
          ["criver", "i was playing pala lv1 rpg for 2min"],
          ["Mellow", "pala was the best choice in this situation, for sustain"],
          ["Scorch", "my dh would have been dead a few times if it weren't for the heals"],
        ]}
      />

      <p>
        That&rsquo;s a narrow set of games: the right spawn, the right
        opponents, an ally with a heal. Jens, the player fuetti credits with
        making the DH work, brings one in one NE game in six, the same as
        everyone else. Outside those games the chat has a name for him.
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

      <p className="dw-foot">
        Picks are from season 25, Europe: 11,000 solo games against 11,000
        of 4v4, 236,000 hero picks, about nine heroes per 4v4 team.
        Shares are of NE player slots, so a DH appears in more games than
        the 16% suggests: 23% of 4v4 games have one somewhere, against 29%
        of solo games. Pick rate isn&rsquo;t strength: the ladder matches on
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
