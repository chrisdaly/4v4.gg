import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { HiOutlineLink } from "react-icons/hi";
import { Button } from "../ui";

/**
 * Hover-only permalink control for one chat line. Rendered as an anchor so
 * middle-click and ctrl/cmd-click open the link normally; a plain click
 * copies the href to the clipboard, rewrites the address bar with
 * replaceState (no navigation) and shows "Copied" for 1.5s.
 */

const COPIED_MS = 1500;

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
  align-self: center;
`;

const LinkButton = styled(Button)`
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  opacity: 0;
  transition: opacity var(--transition), color var(--transition);
  text-decoration: none;

  svg {
    width: 14px;
    height: 14px;
  }

  &:focus-visible,
  &[data-copied="true"] {
    opacity: 1;
  }
`;

const Tip = styled.span`
  position: absolute;
  bottom: calc(100% + 4px);
  right: 0;
  padding: 2px var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
  white-space: nowrap;
  pointer-events: none;
  /* patterns.popover */
  background: rgba(10, 8, 6, 0.96);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px var(--overlay-light);
  z-index: var(--z-popover);
  animation: fadeIn 120ms ease-out;
`;

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function CopyLink({ href, label = "Copy link" }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const onClick = async (e) => {
    // Modified clicks keep the native anchor behaviour (new tab, etc.)
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    await copyText(href);
    try {
      const url = new URL(href);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // href is always same-origin here; ignore a malformed one
    }
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <Wrap>
      <LinkButton
        as="a"
        $icon
        href={href}
        aria-label={label}
        title={label}
        data-copied={copied}
        onClick={onClick}
      >
        <HiOutlineLink />
      </LinkButton>
      {copied && <Tip role="status">Copied</Tip>}
    </Wrap>
  );
}

export { LinkButton as CopyLinkButton };
