/**
 * Server-side Supabase client for the App Router (Server Components, Server
 * Functions, Route Handlers).
 *
 * `cookies()` is async in this Next version, so this factory is async too.
 * The `setAll` try/catch is intentional: cookies cannot be written during a
 * Server Component render — only in a Server Function or Route Handler — so we
 * swallow the throw there and rely on middleware to refresh the session.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Create a request-scoped server Supabase client wired to Next cookies. */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — ignore; middleware refreshes.
          }
        },
      },
    },
  );
};
