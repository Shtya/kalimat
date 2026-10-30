import { NextResponse, type NextRequest } from "next/server";

// Cheap edge gate: no admin cookie → login page. Real session validation
// happens server-side in requireAdmin() on every admin page and action.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.has("adm")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
