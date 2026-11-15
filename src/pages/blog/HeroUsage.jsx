import React from "react";
import { Link } from "react-router-dom";
import RaceModeSplit from "../../components/RaceModeSplit";
import HeroModeSplit from "../../components/HeroModeSplit";
import DemonHunterKit from "../../components/DemonHunterKit";
import people from "../../lib/data/demonHunterPeople.json";
import "../../styles/pages/Blog.css";
import "../../styles/pages/blog/DemonHunter.css";

/**
 * Blog post: why the Demon Hunter, Night Elf's hero in solo, nearly vanishes in 4v4.
 *
 * The argument, carried by the chat and checked against the ladder: in a game
 * of eight players his tools are diluted (one mana bar among many, an evasion
 * that spells ignore), while auras and heals multiply by four. So NE builds a
 * Keeper instead, every aura hero rises, and NE itself sinks to last.
 *
 * Chat exchanges are quoted as typed, chosen after reading the lines around
 * them; a narrator's aside marks any gap of more than a few minutes. French is
 * glossed. Under ~700 words, so no section headings.
 *
 * Every number is a share of picks or player slots, never of games, from a
 * stride across season 25 (heroModeSplit.json, raceModeSplit.json). Per-race
 * hero shares (62% / 16% DH, 29% / 64% Keeper) were computed with the same
 * stride and back-check against those files to within a point. Nothing claims
 * a pick order: the API sorts heroes by XP, not by when they were built.
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
        In solo the Demon Hunter is the Night Elf hero, in 4v4 opening with
        him gets you called names.
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
        In solo, 62% of NE players choose a DH, in 4v4 only 16% do. No hero
        loses more between the two modes, and wonderwood had the reason in
        three lines.
      </p>

      <DemonHunterKit />

      <p>
        Without the DH, the NE altar makes a Keeper of the Grove instead, in
        64% of NE slots against 29% in solo, and the Priestess goes from about
        one NE in ten to nearly half.
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
        When someone defends the DH, the name that comes up is Jens, one of
        the highest-rated NE players in solo. It came up again in August.
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
        Jens mostly doesn&rsquo;t go DH. In solo he picks him less than half
        as often as other NE players, and the Keeper and the Priestess more.
        In 4v4 he brings a DH in one NE game in six, the same as everyone else.
      </p>

      <p>
        NE as a race goes the same way. It&rsquo;s mid-table in solo and last
        in 4v4, and no race falls further. The pick that rises is Random, from
        10% of solo players to 32% of 4v4 ones.
      </p>

      <RaceModeSplit showKey={false} />

      <p>
        Mellow is one of them. On Nov 1, in French, he told ToD what had
        changed.
      </p>

      <Exchange
        when="Nov 1, 2:42am"
        rows={[
          ["Mellow", "depuis que je random je spam pas du tout le meme build tout le temps", "Since I went Random I don't spam the same build all the time."],
          ["ToD", "ouais c'est deja mieux je dirai", "Yeah, that's already better I'd say."],
          ["Mellow", "peu importe à quel point je me donne sur la game, si jfais DH first, jvais me faire insulter quoi", "However hard I try in the game, if I go DH first, I'm getting insulted."],
          ["Mellow", "et ca faisait pas sens pour moi jusqu'a y a 2 jours", "And that didn't make sense to me until two days ago."],
        ]}
      />

      <p>Later that night, the chat settled it.</p>

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
        MMR, so every race wins close to half its games. Jens&rsquo;s figures
        are from Jens#11592: 384 solo games as NE this season, and the 105 of
        his 4v4 games that carry hero data and rolled NE (in 4v4 he queues as
        Random). The DH comes up in about 440 chat messages between February
        and November 2026.
      </p>
    </article>
  );
}
