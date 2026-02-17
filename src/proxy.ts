import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy to protect admin routes
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/admin")) {
        const sessionCookie = request.cookies.get("admin_session");

        if (!sessionCookie || !sessionCookie.value) {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            url.searchParams.set("showLogin", "true");

            return NextResponse.redirect(url);
        }

        try {
            const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
            const parts = decoded.split("-");

            if (parts.length < 2) {
                const url = request.nextUrl.clone();
                url.pathname = "/";
                url.searchParams.set("showLogin", "true");

                return NextResponse.redirect(url);
            }

            const timestamp = parseInt(parts[0], 10);
            const maxAge = 24 * 60 * 60 * 1000;

            if (Date.now() - timestamp > maxAge) {
                const url = request.nextUrl.clone();
                url.pathname = "/";
                url.searchParams.set("showLogin", "true");
                url.searchParams.set("expired", "true");

                const response = NextResponse.redirect(url);

                response.cookies.set("admin_session", "", {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict",
                    maxAge: 0,
                    path: "/",
                });

                return response;
            }

            return NextResponse.next();
        } catch {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            url.searchParams.set("showLogin", "true");

            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
