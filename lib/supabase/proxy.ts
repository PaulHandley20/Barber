import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdmin } from "@/lib/admin-auth";

/*
  Refresca la sesión de Supabase en cada request a /admin (patrón
  oficial de @supabase/ssr) y hace un primer control de acceso.
  La verificación definitiva vive en app/admin/(protected)/layout.tsx.
*/
export async function updateAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/admin/login");

  if (!isLoginPage && (!user || !isAllowedAdmin(user.email))) {
    const url = request.nextUrl.clone();

    url.pathname = "/admin/login";
    url.search = user ? "?error=unauthorized" : "";

    const redirect = NextResponse.redirect(url);

    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));

    return redirect;
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  return response;
}
