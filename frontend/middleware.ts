import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = {
  name: string
  value: string
  options?: CookieOptions
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Set cookies on the request first
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Recreate the response with updated request
          supabaseResponse = NextResponse.next({ request })
          // Set cookies on the response too
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: always call getUser() — this refreshes the session
  // and ensures cookies are forwarded to server components
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublic = pathname === '/'
    || pathname.startsWith('/auth/')
    || pathname.startsWith('/api/')
    || pathname.startsWith('/_next/')
    || pathname.includes('.')

  // Not logged in → redirect to login
  if (!user && !isPublic) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in → redirect away from auth pages
  if (user && pathname.startsWith('/auth/')) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // CRITICAL: return supabaseResponse (not NextResponse.next())
  // This ensures the refreshed session cookies are forwarded
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
}
