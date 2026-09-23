import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { ThemedCard } from "../ui";
import { fetchUnfurl } from "../../lib/chat/unfurl";

/**
 * Compact link card under a feed line for a Twitch clip or YouTube video.
 * The line itself renders first; the card appears once metadata arrives
 * and never renders at all when the lookup fails.
 *
 *   target  { kind, id, url, host } from detectUnfurl()
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
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    fetchUnfurl(target).then((m) => {
      if (!cancelled) setMeta(m);
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!meta) return null;
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
