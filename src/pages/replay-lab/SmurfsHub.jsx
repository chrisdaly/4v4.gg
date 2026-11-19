import React, { useCallback } from "react";
import styled from "styled-components";
import { useLocation, useHistory } from "react-router-dom";
import { Button } from "../../components/ui";
import useAdmin from "../../lib/useAdmin";
import SmurfsTab from "./SmurfsTab";
import ValidationTab from "./ValidationTab";

// Three jobs, one at a time: what we already know, what the scorer suggests,
// and pairs known from outside the site. Kept in ?view= so a view can be linked.
const VIEWS = [
  { key: "confirmed", label: "Confirmed", lead: "Accounts known to be the same player. These are the test cases every model is measured on." },
  { key: "review", label: "To review", lead: "Pairs the scorer thinks play alike, closest first. Mark each one: Same player moves it to Confirmed, Different players and Not sure take it out of the queue." },
  { key: "add", label: "Add a pair", lead: "A pair you know about from outside the site.", admin: true },
];

export default function SmurfsHub() {
  const location = useLocation();
  const history = useHistory();
  const { isAdmin } = useAdmin();
  const views = VIEWS.filter(v => !v.admin || isAdmin);
  const asked = new URLSearchParams(location.search).get("view");
  const view = views.find(v => v.key === asked) || views[0];

  const go = useCallback((key) => {
    const p = new URLSearchParams(location.search);
    if (key === "confirmed") p.delete("view"); else p.set("view", key);
    history.replace({ search: p.toString() });
  }, [location.search, history]);

  return (
    <>
      <Switcher role="tablist">
        {views.map(v => (
          <Button key={v.key} $pill role="tab" aria-selected={v.key === view.key}
            data-active={v.key === view.key} onClick={() => go(v.key)}>
            {v.label}
          </Button>
        ))}
      </Switcher>
      <Lead>{view.lead}</Lead>
      {view.key === "confirmed" && <ValidationTab part="list" />}
      {view.key === "review" && <SmurfsTab />}
      {view.key === "add" && <ValidationTab part="add" onAdded={() => go("confirmed")} />}
    </>
  );
}

const Switcher = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
`;

const Lead = styled.p`
  font: var(--text-xs) var(--font-mono);
  color: var(--grey-light);
  max-width: 720px;
  line-height: 1.6;
  margin: 0 0 var(--space-6);
`;
