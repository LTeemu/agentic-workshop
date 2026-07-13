import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes — redirect unauthenticated users
  if (pathname.startsWith("/dashboard")) {
    // Use the auth API route instead of importing the DB directly
    // (DB driver isn't compatible with Edge Runtime)
    const sessionRes = await fetch(
      new URL("/api/auth/get-session", request.url),
      { headers: request.headers },
    );
    if (!sessionRes.ok) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const body = await sessionRes.json();
    if (!body || !body.session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
