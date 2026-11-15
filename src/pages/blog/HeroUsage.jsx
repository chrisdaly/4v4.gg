import React from "react";
import RaceModeSplit from "../../components/RaceModeSplit";
import HeroModeSplit from "../../components/HeroModeSplit";
import DemonHunterKit from "../../components/DemonHunterKit";
import "../../styles/pages/Blog.css";

/**
 * Blog post: what 4v4 does to hero and race selection.
 *
 * A component post rather than markdown in the relay, because the charts are
 * the argument and a markdown post cannot hold them.
 *
 * The flow only ever widens: one hero's kit, then what his race lost, then
 * every hero, then every race. It never returns to a subject it has left.
 *
 * Every number here is a share of picks or of player slots, never of games,
 * and it comes from a stride across the whole of season 25 rather than a read
 * from the top of the feed, which is one day of ladder. Nothing claims a pick
 * order: the API's hero array is sorted by XP, so first-built is not knowable.
 *
 * Voice: the words players use (solo, NE, DH), contractions, and a comparison
 * carried in one sentence rather than split into two clipped halves.
 */
export default function HeroUsage() {
  return (
    <article className="bl-content bl-section bu-article">
      <p className="bu-lede">
        The Demon Hunter is reckoned one of the strongest heroes in solo, and
        he&rsquo;s the hero Night Elf gets built around. In 4v4 he barely
        features.
      </p>

      <p>
        Nothing translates worse between the two modes. In solo, 62% of NE
        players choose a DH, in 4v4 only 16% do. His kit is most of the reason.
      </p>

      <DemonHunterKit />

      <p>
        Take him out and NE loses more than a hero. In 4v4 the altar makes a
        Keeper of the Grove instead, in 64% of NE slots against 29% in solo, and
        the Priestess rises nearly as far. That&rsquo;s a different opening,
        different timings, and a different army behind it.
      </p>

      <p>He&rsquo;s not the only hero this happens to.</p>

      <HeroModeSplit />

      <p>
        The five biggest risers are all auras or team heals: the Tauren
        Chieftain&rsquo;s Endurance Aura, the Priestess&rsquo;s Trueshot, the
        Paladin&rsquo;s Devotion and Holy Light, the Shadow Hunter&rsquo;s
        Healing Wave, the Keeper&rsquo;s Thorns and Tranquility. An aura that
        buffs one player in solo buffs four in 4v4.
      </p>

      <p>The same thing happens a level up, in which race people pick.</p>

      <RaceModeSplit showKey={false} />

      <p>
        NE is mid-table in solo and last in 4v4, and no race falls further.
        Random goes the other way and becomes the most common pick in the mode,
        which isn&rsquo;t arithmetic at all: 4v4 is where people go to enjoy
        themselves.
      </p>

      <p className="bu-foot">
        29% of solo games have a DH in them against 23% of 4v4 ones, much closer
        than the gap between players, because about eighteen heroes get picked
        in a 4v4 game and someone usually brings one. It&rsquo;s just rarely the
        NE in front of you. Pick rate isn&rsquo;t strength either: the ladder
        matches on MMR, so every race wins close to half its games whatever
        it&rsquo;s actually worth. Season 25, Europe, 11,000 solo games against
        11,000 of 4v4, 236,000 hero picks.
      </p>
    </article>
  );
}
