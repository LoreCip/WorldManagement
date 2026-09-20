import { useEffect, useState } from "react";
import { invokeSafe } from "../lib/ipc";

function sniffMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
  return "application/octet-stream";
}

function toDataUrl(buffer: ArrayBuffer): Promise<string> {
  const blob = new Blob([buffer], { type: sniffMime(new Uint8Array(buffer, 0, 4)) });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Carica un'immagine leggendone i byte via IPC (invece di affidarsi al
// protocollo `asset://`) e la espone come data URL. Si usa un data URL e non
// un blob URL perche' in WebView2 il blob revocato/perso durante i re-render
// di Leaflet produce ERR_FILE_NOT_FOUND; un data URL non ha un ciclo di vita.
export function useIpcImageUrl(
  command: string,
  args: Record<string, unknown> | null,
): { url: string | null; error: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setUrl(null);
    setError(false);
    if (!args) return;

    let cancelled = false;

    (async () => {
      const bytes = await invokeSafe<ArrayBuffer>(command, args);
      if (cancelled) return;
      if (!bytes) {
        setError(true);
        return;
      }
      try {
        const dataUrl = await toDataUrl(bytes);
        if (!cancelled) setUrl(dataUrl);
      } catch (err) {
        console.error("Errore conversione immagine:", err);
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, JSON.stringify(args)]);

  return { url, error };
}
