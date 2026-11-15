import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import ScoutTab from "../pages/replay-lab/ScoutTab";

// The embedded Playstyle tab imports replays on its own when a player has no
// fingerprints. An import spends W3C's daily replay-download budget, so it
// must only start once the relay has said the player is unknown (404).

const path = (url) => String(url).replace(/^https?:\/\/[^/]+/, "");

function mockRelay(profileResponse) {
  const calls = [];
  global.fetch = vi.fn(async (url, opts) => {
    const p = path(url);
    calls.push(`${opts?.method || "GET"} ${p}`);
    if (p === "/api/fingerprints/import") {
      return { ok: true, status: 202, json: async () => ({ status: "running" }) };
    }
    if (/\/profile\/[^/]+$/.test(p)) return profileResponse();
    return { ok: true, status: 200, json: async () => ({}) };
  });
  return calls;
}

const mount = () =>
  render(
    <MemoryRouter>
      <ScoutTab initialPlayer="Foo#1" embedded />
    </MemoryRouter>
  );

const imports = (calls) => calls.filter((c) => c === "POST /api/fingerprints/import");
const settle = () => new Promise((r) => setTimeout(r, 100));

describe("ScoutTab embedded auto-import", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("does not import for a player who already has fingerprints", async () => {
    const calls = mockRelay(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ battleTag: "Foo#1", replayCount: 5, averaged: {} }),
    }));
    mount();
    await waitFor(() => expect(calls.some((c) => c.endsWith("/replays"))).toBe(true));
    await settle();
    expect(imports(calls)).toHaveLength(0);
  });

  it("imports once when the relay has no fingerprints for the player", async () => {
    const calls = mockRelay(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    mount();
    await waitFor(() => expect(imports(calls)).toHaveLength(1));
    await settle();
    expect(imports(calls)).toHaveLength(1);
  });

  it("does not import when the profile request fails", async () => {
    const calls = mockRelay(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    mount();
    await screen.findByText(/Could not load playstyle data/);
    expect(imports(calls)).toHaveLength(0);
  });
});
