import { useState, useCallback } from "react";
import html2canvas from "html2canvas";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/**
 * Custom hook for html2canvas screenshot of a digest.
 *
 * Input: { digestRef, dateTabs, label, digestDate }
 * Output: { copyState, handleScreenshot }
 */
export default function useScreenshot({ digestRef, dateTabs, label, digestDate }) {
  const [copyState, setCopyState] = useState(null); // null | "copying" | "copied" | "saved"

  const handleScreenshot = useCallback(async () => {
    if (!digestRef.current || copyState === "copying") return;
    setCopyState("copying");
    try {
      const imgs = digestRef.current.querySelectorAll(".digest-avatar");
      const imgDataMap = new Map();
      await Promise.all([...imgs].map(async (img) => {
        if (!img.src || img.src.startsWith("data:")) return;
        try {
          const proxyUrl = `${RELAY_URL}/api/admin/image-proxy?url=${encodeURIComponent(img.src)}`;
          const resp = await fetch(proxyUrl);
          if (!resp.ok) return;
          const blob = await resp.blob();
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          imgDataMap.set(img.src, dataUrl);
        } catch { /* skip unloadable images */ }
      }));

      const canvas = await html2canvas(digestRef.current, {
        backgroundColor: "#0f0d0b",
        scale: 2,
        useCORS: true,
        onclone: (_doc, el) => {
          el.style.backdropFilter = "none";
          el.style.webkitBackdropFilter = "none";
          el.style.background = "#0f0d0b";
          el.style.padding = "24px 32px 28px";

          // Hide screenshot button, chat transcripts, and admin controls
          const btn = el.querySelector(".digest-screenshot-btn");
          if (btn) btn.style.display = "none";
          for (const ctx of el.querySelectorAll(".chat-context")) {
            ctx.style.display = "none";
          }
          for (const ctrl of el.querySelectorAll(".digest-admin-controls")) {
            ctrl.style.display = "none";
          }
          for (const ctrl of el.querySelectorAll(".digest-admin-footer")) {
            ctrl.style.display = "none";
          }
          for (const dim of el.querySelectorAll(".digest-bullet-row--dimmed")) {
            dim.style.display = "none";
          }

          // Replace date tabs with a branded header
          const header = el.querySelector(".news-digest-header");
          if (header) {
            const activeTab = dateTabs?.find((t) => t.active);
            const dateLabel = activeTab?.label || label;
            header.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-family:var(--font-display);font-size:20px;color:var(--gold);letter-spacing:0.04em">4V4.GG</span><span style="font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:var(--grey-light)">${dateLabel}</span></div>`;
          }

          // Tighten stat sections
          for (const s of el.querySelectorAll(".digest-section--winner,.digest-section--loser,.digest-section--grinder,.digest-section--hotstreak,.digest-section--coldstreak")) {
            s.style.padding = "6px 16px";
          }

          // Replace avatar srcs with pre-fetched data URLs
          for (const img of el.querySelectorAll(".digest-avatar")) {
            const dataUrl = imgDataMap.get(img.src);
            if (dataUrl) img.src = dataUrl;
            else img.style.display = "none";
          }

          // Add footer
          const footer = _doc.createElement("div");
          footer.style.cssText = "text-align:right;padding-top:12px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:#555";
          footer.textContent = "4v4.gg/news";
          el.appendChild(footer);
        },
      });
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopyState("copied");
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `4v4gg-digest-${digestDate || "today"}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setCopyState("saved");
      }
    } catch {
      setCopyState(null);
    }
    setTimeout(() => setCopyState(null), 2000);
  }, [digestRef, dateTabs, label, digestDate, copyState]);

  return { copyState, handleScreenshot };
}
