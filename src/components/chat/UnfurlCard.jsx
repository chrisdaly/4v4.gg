import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { ThemedCard } from "../ui";
import { fetchUnfurl } from "../../lib/chat/unfurl";

/**
 * Compact link card under a feed line for a Twitch clip or YouTube video.
 * The card holds its own height from the first paint, so a row that has a
 * link is the same height before and after the lookup lands. Only a failed
 * lookup collapses it, once, and the failure is cached for the page.
 *
 *   target  { kind, id, url, host } from detectUnfurl()
 *
 * detectUnfurl builds a new object for the same link on every render, so
 * the lookup keys off kind and id rather than the object: an effect on
 * `target` would re-run on every re-render of the row, blanking the card
 * and taking ~110px out of the stream each time.
 */

const Card = styled(ThemedCard).attrs({ as: "a", $radius: "var(--radius-md)", $padding: "var(--space-2)" })`
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: center;
  max-width: 480px;
  margin: var(--space-1) 0 var(--space-1);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition);

  &:hover {
    border-color: var(--gold);
  }

  @media (max-width: 480px) {
    grid-template-columns: 120px minmax(0, 1fr);
  }
`;

const Thumb = styled.img`
  width: 160px;
  height: 90px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  display: block;

  @media (max-width: 480px) {
    width: 120px;
    height: 68px;
  }
`;

const ThumbEmpty = styled.div`
  width: 160px;
  height: 90px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);

  @media (max-width: 480px) {
    width: 120px;
    height: 68px;
  }
`;

/* The same box as Card, held while the lookup is in flight: content-box
   90px + 8px padding + 1px border on each side is exactly the loaded
   card's height, so the card lands without moving the stream. */
const CardShell = styled.div`
  box-sizing: content-box;
  height: 90px;
  max-width: 480px;
  padding: var(--space-2);
  margin: var(--space-1) 0 var(--space-1);
  border: 1px solid transparent;

  @media (max-width: 480px) {
    height: 68px;
  }
`;

const Body = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CardTitle = styled.span`
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--white);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Host = styled.span`
  font: var(--text-xxxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export default function UnfurlCard({ target }) {
  const { kind, id } = target;
  // null while the lookup is in flight, false once it has failed
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    fetchUnfurl({ kind, id }).then((m) => {
      if (!cancelled) setMeta(m || false);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  if (meta === false) return null;
  if (!meta) return <CardShell aria-hidden="true" data-testid="unfurl-pending" />;
  const href = meta.url || target.url;
  const host = meta.author ? `${target.host} · ${meta.author}` : target.host;

  return (
    <Card href={href} target="_blank" rel="noopener noreferrer" data-testid="unfurl-card" data-kind={target.kind}>
      {meta.thumbnail ? <Thumb src={meta.thumbnail} alt="" loading="lazy" /> : <ThumbEmpty />}
      <Body>
        <CardTitle>{meta.title}</CardTitle>
        <Host>{host}</Host>
      </Body>
    </Card>
  );
}
