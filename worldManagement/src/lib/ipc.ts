import { invoke } from "@tauri-apps/api/core";

// Wrapper unico per le chiamate IPC Tauri: centralizza error handling
// e logging, cosi gli hook di dominio non duplicano lo stesso try/catch.
export async function invokeSafe<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.error(`Errore IPC [${cmd}]:`, err);
    return null;
  }
}

// Variante che rilancia l'errore invece di restituire null. Da usare per
// le mutation (save/delete), dove un fallimento silenzioso nasconderebbe
// un'operazione non andata a buon fine e il chiamante deve poterlo gestire
// esplicitamente (es. mostrare una notifica di errore).
export async function invokeOrThrow<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.error(`Errore IPC [${cmd}]:`, err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}
