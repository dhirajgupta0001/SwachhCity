import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/register") || request.nextUrl.pathname.startsWith("/forgot-password");

  if (!user && !isPublicRoute && !request.nextUrl.pathname.startsWith("/_next")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is authenticated, we need to enforce role-based access
  if (user) {
    // Fetch profile to get role. In a real app, you might use JWT claims for performance,
    // but fetching from DB provides immediate revocation without token refresh delay.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "CITIZEN";
    const status = profile?.status || "ACTIVE";

    // 1. If suspended or disabled, sign them out and redirect to login
    if (status !== "ACTIVE") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "account_inactive");
      return NextResponse.redirect(url);
    }

    // Block authenticated users from logging in/registering again
    if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") {
      const url = request.nextUrl.clone();
      if (role === "ADMIN") url.pathname = "/admin/dashboard";
      else if (role === "COLLECTOR") url.pathname = "/collector/dashboard";
      else url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Enforce role boundaries
    const path = request.nextUrl.pathname;
    
    if (path.startsWith("/admin") && role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = role === "COLLECTOR" ? "/collector/dashboard" : "/dashboard";
      return NextResponse.redirect(url);
    }
    
    if (path.startsWith("/collector") && role !== "COLLECTOR") {
      const url = request.nextUrl.clone();
      url.pathname = role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
      return NextResponse.redirect(url);
    }
    
    // Protect citizen routes from other roles
    const citizenRoutes = ["/dashboard", "/report", "/pickup", "/history", "/education", "/profile"];
    if (citizenRoutes.some(r => path.startsWith(r)) && role !== "CITIZEN") {
      const url = request.nextUrl.clone();
      url.pathname = role === "ADMIN" ? "/admin/dashboard" : "/collector/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
