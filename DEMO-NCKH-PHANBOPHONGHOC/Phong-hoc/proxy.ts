import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  getPortalSessionCookieName,
  type PortalSessionRole,
} from "@/lib/supabase/portal-session"

function roleFromPathname(pathname: string): PortalSessionRole {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin"
  if (pathname === "/lecturer" || pathname.startsWith("/lecturer/")) return "lecturer"
  return "student"
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const role = roleFromPathname(request.nextUrl.pathname)
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: {
      name: getPortalSessionCookieName(role),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
