import { useCallback, useEffect, useRef, useState } from "react";
import { invokeOrThrow } from "../lib/ipc";

export interface UseAsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export interface UseAsyncResult<T> extends UseAsyncState<T> {
  /** Esegue la chiamata IPC; ritorna il risultato, o null se fallita (vedi `error`). */
  run: (args?: Record<string, unknown>) => Promise<T | null>;
  reset: () => void;
}

export function useAsync<T>(cmd: string): UseAsyncResult<T> {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (args?: Record<string, unknown>): Promise<T | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await invokeOrThrow<T>(cmd, args);
        if (mountedRef.current) setState({ data: result, error: null, isLoading: false });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) setState({ data: null, error, isLoading: false });
        return null;
      }
    },
    [cmd],
  );

  const reset = useCallback(() => setState({ data: null, error: null, isLoading: false }), []);

  return { ...state, run, reset };
}
