import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request so Server Components
 * see a fresh session. Planner has no auth gate — signing in only unlocks
 * cloud sync, so this never redirects.
 */
export async function proxy(request: NextRequest) {
  // supabaseResponse must be used as the return value so session cookies are
  // written back. Do not create a new NextResponse.next() elsewhere in this fn.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request first (so subsequent SSR reads see them).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Recreate the response so all cookie writes end up on the same object.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touches the session so Supabase refreshes it if near expiry.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf)$).*)",
  ],
};
