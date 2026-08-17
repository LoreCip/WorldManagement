import { useCallback, useEffect, useRef, useState } from "react";

interface UsePinchZoomOptions {
  min?: number;
  max?: number;
  /** Quanto reattivo e il pinch trackpad / Ctrl+rotellina. */
  sensitivity?: number;
  initialScale?: number;
}

// Zoom-to-cursor su un contenitore scrollabile: applica lo scale
// mantenendo il punto sotto il cursore fisso, throttlato via
// requestAnimationFrame per restare fluido durante il pinch continuo.
// Generico: nessuna dipendenza dal contenuto (PDF, mappa, canvas...),
// intercetta solo l'evento "wheel" con ctrlKey (pinch trackpad o
// Ctrl/Cmd + rotellina) sul nodo assegnato a `containerRef`.
export function usePinchZoom({ min = 0.4, max = 3, sensitivity = 0.012, initialScale = 1 }: UsePinchZoomOptions = {}) {
  const [scale, setScale] = useState(initialScale);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const pendingScaleRef = useRef<number | null>(null);
  const pendingAnchorRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const applyPendingZoom = useCallback(() => {
    rafIdRef.current = null;

    const container = containerRef.current;
    const nextScale = pendingScaleRef.current;
    const anchor = pendingAnchorRef.current;
    if (!container || nextScale == null) return;

    setScale((prevScale) => {
      if (Math.abs(nextScale - prevScale) < 0.001) return prevScale;

      if (anchor) {
        const rect = container.getBoundingClientRect();
        // Posizione del cursore relativa al contenuto scrollabile (prima dello zoom)
        const offsetX = anchor.clientX - rect.left + container.scrollLeft;
        const offsetY = anchor.clientY - rect.top + container.scrollTop;
        const ratio = nextScale / prevScale;

        // Applica il nuovo scroll dopo che React ha ri-renderizzato con la nuova scala
        requestAnimationFrame(() => {
          if (!container) return;
          container.scrollLeft = offsetX * ratio - (anchor.clientX - rect.left);
          container.scrollTop = offsetY * ratio - (anchor.clientY - rect.top);
        });
      }

      return nextScale;
    });
  }, []);

  const scheduleZoom = useCallback(
    (nextScale: number, clientX: number, clientY: number) => {
      pendingScaleRef.current = Math.min(max, Math.max(min, nextScale));
      pendingAnchorRef.current = { clientX, clientY };

      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(applyPendingZoom);
      }
    },
    [applyPendingZoom, min, max]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; // lascia passare lo scroll normale a due dita
      e.preventDefault();

      setScale((current) => {
        const factor = Math.exp(-e.deltaY * sensitivity);
        scheduleZoom(current * factor, e.clientX, e.clientY);
        return current; // lo stato reale viene aggiornato dentro scheduleZoom/applyPendingZoom
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scheduleZoom, sensitivity]);

  const zoomIn = useCallback(() => setScale((s) => Math.min(max, +(s + 0.15).toFixed(3))), [max]);
  const zoomOut = useCallback(() => setScale((s) => Math.max(min, +(s - 0.15).toFixed(3))), [min]);
  const zoomReset = useCallback(() => setScale(initialScale), [initialScale]);

  return { scale, containerRef, zoomIn, zoomOut, zoomReset, setScale };
}