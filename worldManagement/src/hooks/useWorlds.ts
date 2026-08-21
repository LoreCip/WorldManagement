import { useCallback, useEffect, useState } from "react";
import { invokeSafe, invokeOrThrow } from "../lib/ipc";
import { beginWorldTransition } from "../lib/worldTransition";
import { useLocalization } from "../context/LocalizationContext";
import { WorldInfo } from "../types/world";

export const useWorlds = () => {
  const { t } = useLocalization();
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchWorlds = useCallback(async () => {
    const res = await invokeSafe<WorldInfo[]>("list_worlds");
    if (res !== null) setWorlds(res);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const createWorld = useCallback(
    async (name: string) => {
      try {
        await invokeOrThrow<WorldInfo>("create_world", { name });
        beginWorldTransition(t("settings.worlds.switching"));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [t],
  );

  const switchWorld = useCallback(
    async (id: string) => {
      try {
        await invokeOrThrow<WorldInfo>("switch_world", { id });
        beginWorldTransition(t("settings.worlds.switching"));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [t],
  );

  const renameWorld = useCallback(
    async (id: string, name: string) => {
      try {
        await invokeOrThrow<WorldInfo>("rename_world", { id, name });
        await fetchWorlds();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [fetchWorlds],
  );

  const deleteWorld = useCallback(async (id: string) => {
    try {
      await invokeOrThrow<WorldInfo[]>("delete_world", { id });
      await fetchWorlds();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [fetchWorlds]);

  return {
    worlds,
    isLoaded,
    error,
    clearError,
    createWorld,
    switchWorld,
    renameWorld,
    deleteWorld,
  };
};
