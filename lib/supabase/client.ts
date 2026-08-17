import { createBrowserClient } from "@supabase/ssr";
import { configSupabase } from "./config";

/** Cliente para Client Components (login e realtime do chat). */
export function supabaseNavegador() {
  const { url, chave } = configSupabase();
  return createBrowserClient(url, chave);
}
