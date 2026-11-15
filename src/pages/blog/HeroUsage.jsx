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
 * glossed. Under ~700 words, so no section headings.
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
        hero&rsquo;s pick rate falls further between the two modes, and
        wonderwood had the reason in three lines.
      </p>

      <DemonHunterKit />

      <p>
        His place goes to a Keeper of the Grove, in 64% of NE slots against
        29% in solo, and the Priestess goes from about one NE in ten to
        nearly half. In May the chat worked through it.
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

      <p>
        The healers Lynfan wants beside him rise in 4v4 too, and so does
        every aura carrier. An aura that helps one player in solo helps four
        in 4v4.
      </p>

      <HeroModeSplit />

      <p>
        The 16% who still bring a DH mostly know when. A 4v4 doesn&rsquo;t
        start as a 4v4. For the first few minutes it&rsquo;s four separate
        games, and a player in the corner spawn, close to the enemy, is
        playing something near a solo game. Galen, the player ToD was
        calling brain rot, explained himself after the game.
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
        They agree on when he works, a 2v2 in the first minutes, and argue
        only about whether that&rsquo;s worth a hero slot. The players who
        rate the DH talk about the corner, the harass and the first fight.
      </p>

      <Exchange
        when="Mar 1, after a harass"
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
        The chat&rsquo;s other defence of the DH is one player.
      </p>

      <Exchange
        when="Aug 5, the same conversation"
        rows={[
          ["SeeKer", "Look at the best elf"],
          ["SeeKer", "Jens is Jens, but, he goes dh :)"],
          ["wonderwood", "i think at some point people are so good they can make anything work"],
          [null, "Eleven minutes later:"],
          ["ToD", "what applies to a truly high level player doesnt necessarily apply to rest"],
          ["ToD", "you can give a katana to a samurai and he'll be deadly"],
          ["ToD", "give it to some random and he'll chop his own limbers"],
          ["ToD", "limbs"],
        ]}
      />

      <p>
        Jens brings a DH in one NE game in six, the same as everyone else.
        Whether those are his corner spawns, the data can&rsquo;t say. The
        window closes fast either way. Once the sides join up, the eight
        players fight as one army each, and the DH is one hero among
        eighteen.
      </p>

      <Exchange
        when="Nov 1, 5:16am"
        rows={[
          ["ToD", "les ours sont contres par toutes les unitées en 4v4", "Bears get countered by every unit in 4v4."],
          ["ToD", "et dh ... completement naze", "And DH... completely useless."],
          ["Mellow", "mais oui DH bears c'est vrmt de la merde je confirme", "Yeah, DH bears really is crap, I confirm."],
          ["Apm50", "dh=dead hero Kappa"],
          ["ToD", "yep"],
        ]}
      />

      <p className="dw-foot">
        Picks are from season 25, Europe: 11,000 solo games against 11,000
        of 4v4, 236,000 hero picks, about eighteen heroes per 4v4 game.
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
