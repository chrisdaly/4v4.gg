import { useState, useCallback } from "react";

/**
 * Shared drag-to-reorder hook for editorial item lists.
 * Returns state + handlers for drag events on section-keyed lists.
 */
export default function useDragReorder() {
  const [dragState, setDragState] = useState({ section: null, from: null, over: null });

  const onDragStart = useCallback((section, idx) => {
    setDragState({ section, from: idx, over: null });
  }, []);

  const onDragOver = useCallback((section, idx) => {
    setDragState((s) => (s.section === section ? { ...s, over: idx } : s));
  }, []);

  const onDragLeave = useCallback((idx) => {
    setDragState((s) => (s.over === idx ? { ...s, over: null } : s));
  }, []);

  const onDrop = useCallback((section, toIdx, callback) => {
    setDragState((prev) => {
      const { from } = prev;
      if (prev.section === section && from != null && from !== toIdx && callback) {
        callback(section, from, toIdx);
      }
      return { section: null, from: null, over: null };
    });
  }, []);

  const onDragEnd = useCallback(() => {
    setDragState({ section: null, from: null, over: null });
  }, []);

  const isDragOver = useCallback((section, idx) => {
    return dragState.section === section && dragState.over === idx;
  }, [dragState]);

  return { dragState, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, isDragOver };
}
