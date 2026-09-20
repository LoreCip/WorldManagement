import { useEffect, useState } from "react";
import { invokeSafe } from "../lib/ipc";

// Carica un'immagine leggendone i byte via IPC (invece di affidarsi al
// protocollo `asset://`) e la espone come blob URL. Evita i problemi di
// risoluzione/scope del protocollo asset su Windows, dove path assoluti con
// backslash possono non superare il matching dei pattern glob configurati.
export function useIpcImageUrl(
  command: string,
  args: Record<string, unknown> | null,
): { url: string | null; error: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!args) {
      setUrl(null);
      setError(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setError(false);

    (async () => {
      const bytes = await invokeSafe<ArrayBuffer>(command, args);
      if (cancelled) return;

      if (!bytes) {
        setError(true);
        setUrl(null);
        return;
      }

      objectUrl = URL.createObjectURL(new Blob([bytes]));
      setUrl(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, JSON.stringify(args)]);

  return { url, error };
}
