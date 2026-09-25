import React from "react";
import { Link } from "react-router-dom";
import { CountryFlag } from "../ui";
import useCountUp from "../../lib/home/useCountUp";

/**
 * The home page's scoreboard header: players online (Friz 96px gold) and
 * games live (white, pulsing red dot) counting up on load, the quote of the
 * day with its speaker's avatar and flag, and the ENTER THE JUNGLE call to
 * action into /chat.
 *
 * Props
 *   online     the chat roster size (null while connecting)
 *   live       the ongoing match count (null before the first poll)
 *   quote      { text, speaker, battleTag } | null
 *   quoteHref  where the quote links: the message in the chat
 *              (/chat?m=&at=) once found, else /chat
 *   profile    the speaker's profile { profilePicUrl, country } | null
 */

export default function Scoreboard({ online, live, quote, quoteHref = null, profile }) {
  const onlineShown = useCountUp(online);
  const liveShown = useCountUp(live);
  const speakerHref = quoteHref || "/chat";
  return (
    <header className="hm-board" data-scoreboard>
      <div className="hm-board-figures">
        <div className="hm-figure">
          <span className="hm-figure-num hm-figure-gold" data-count="online">{onlineShown}</span>
          <span className="hm-figure-label">PLAYERS ONLINE</span>
        </div>
        <div className="hm-figure-divider" />
        <div className="hm-figure">
          <span className="hm-figure-num" data-count="live">
            {liveShown}
            <span className="hm-figure-dot" aria-hidden="true" />
          </span>
          <span className="hm-figure-label">GAMES LIVE</span>
        </div>
      </div>
      <div className="hm-board-side">
        {quote && (
          <Link to={speakerHref} className="hm-quote" data-quote title="Open in the chat">
            <span className="hm-quote-label">QUOTE OF THE DAY</span>
            <span className="hm-quote-text">“{quote.text}”</span>
            <span className="hm-quote-by">
              <span className="hm-quote-name">{quote.speaker}</span>
              {(profile?.profilePicUrl || profile?.country) && (
                <span className="hm-quote-avatar">
                  {profile?.profilePicUrl && <img src={profile.profilePicUrl} alt="" className="hm-quote-pic" />}
                  {profile?.country && (
                    <span className="hm-quote-flag">
                      <CountryFlag name={profile.country.toLowerCase()} />
                    </span>
                  )}
                </span>
              )}
            </span>
          </Link>
        )}
        <Link to="/chat" className="hm-cta" data-cta>ENTER THE JUNGLE →</Link>
      </div>
    </header>
  );
}
