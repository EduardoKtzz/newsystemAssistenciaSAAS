import { createBrowserClient } from "@supabase/ssr";

/** Cliente para Client Components (login e realtime do chat). */
export function supabaseNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
