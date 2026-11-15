import React from "react";

/**
 * What the Demon Hunter actually does, ability by ability.
 *
 * The point of showing all four is that "4v4 is bad for him" is too blunt.
 * Only Mana Burn is actually diluted by the extra players. Immolation wants
 * the crowd and cannot survive it, Evasion does not care how many people are
 * in the game, and Metamorphosis is fine in both modes.
 */

const KIT = [
  {
    icon: "manaburn",
    name: "Mana Burn",
    text:
      "Burns up to 150 mana and deals that much damage. In solo that is one of the one to three heroes opposite you, so you can keep his caster dry all game. In 4v4 the other team brings around nine, and the ones you didn't touch cast anyway.",
    verdict: "diluted",
  },
  {
    icon: "immolation",
    name: "Immolation",
    text:
      "Wants a crowd, and 4v4 has one. The problem is getting there: standing in the middle of eight players with that much spell damage on the field is how he dies.",
    verdict: "exposed",
  },
  {
    icon: "evasion",
    name: "Evasion",
    text:
      "Dodges attacks, not spells. Making it count means staying in range, and most of what kills you in a 4v4 fight goes straight through it.",
    verdict: "bypassed",
  },
  {
    icon: "metamorphosis",
    name: "Metamorphosis",
    text:
      "Genuinely good, and the one part of him 4v4 does not argue with. It needs level 6, which about one Demon Hunter in ten gets to, slightly more often in 4v4 than in solo.",
    verdict: "good",
  },
];

const VERDICT = {
  diluted: { label: "diluted", cls: "dh-v-worse" },
  exposed: { label: "gets him killed", cls: "dh-v-worse" },
  bypassed: { label: "bypassed", cls: "dh-v-worse" },
  good: { label: "still good", cls: "dh-v-better" },
};

export default function DemonHunterKit() {
  return (
    <figure className="dh-kit">
      <div className="dh-kit-head">
        <img src="/heroes/demonhunter.jpeg" alt="" className="dh-portrait" />
        <div>
          <div className="dh-name">Demon Hunter</div>
          <div className="dh-role">Night Elf</div>
        </div>
      </div>

      <ul className="dh-list">
        {KIT.map((a) => (
          <li key={a.icon} className="dh-row">
            <img src={`/abilities/${a.icon}.png`} alt="" className="dh-icon" />
            <div className="dh-copy">
              <div className="dh-ability">
                {a.name}
                <span className={`dh-verdict ${VERDICT[a.verdict].cls}`}>
                  {VERDICT[a.verdict].label}
                </span>
              </div>
              <p className="dh-text">{a.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="dh-foot">
        He can be made to work in 4v4, but the team has to commit to it: a dedicated healer,
        a second staff, invulnerability, anti-magic. You are deciding to keep a hero alive that
        all four opponents want dead.
      </p>
    </figure>
  );
}
