import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLogin = pathname.startsWith('/login')
  const isApi = pathname.startsWith('/api')

  let response = NextResponse.next({ request })

  // Skip auth check for login page - serve immediately on mobile
  if (isLogin) {
    return response
  }

  // Skip auth check for static assets
  if (pathname.includes('_next') || pathname.includes('favicon')) {
    return response
  }

  // Only check session for protected routes (not login, not public API health checks)
  if (!isApi || pathname !== '/api/health') {
    // Páginas: check barato de cookie (0 red). Cada página valida su propia sesión
    // con getUser() en el servidor; el middleware solo redirige si no hay cookie.
    if (!isApi) {
      const hasSessionCookie = request.cookies
        .getAll()
        .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
      if (!hasSessionCookie) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return response
    }

    // APIs: validación real del JWT (necesaria para rate-limit por user y 401s)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Mirror cookies onto the response so auth refresh works
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )

    let session = null
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      // getUser() valida el JWT contra Supabase Auth (getSession() confía en la cookie sin verificar)
      // Tope de 3s para no colgar la request si Supabase Auth degrada
      const userPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), 3000)
      })
      // Evita unhandled rejection si el timeout pierde la carrera
      timeoutPromise.catch(() => {})

      const {
        data: { user },
        error,
      } = (await Promise.race([userPromise, timeoutPromise])) as any

      if (error) {
        // Clear cookies to prevent infinite refresh error spam if token is invalid
        const cookiesToClear = request.cookies.getAll().filter((c) => c.name.startsWith('sb-'))
        cookiesToClear.forEach((c) => {
          response.cookies.set(c.name, '', { maxAge: -1 })
        })
      } else if (user) {
        session = { user }
      }
    } catch (e) {
      // Fail-safe: assume no session if check fails
    } finally {
      if (timer) clearTimeout(timer)
    }

    // Rate limit for API endpoints ONLY (not page requests)
    if (isApi) {
      const userId = session?.user?.id
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
      const id = userId ? `user:${userId}` : `ip:${ip}`
      try {
        const rl = await rateLimit(id, { limit: 60, windowSec: 60 })
        if (!rl.ok) {
          return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          })
        }
      } catch {
        // Fail open if rate limiter backend is unavailable
      }
    }
  }

  return response
}

// Protect everything except the login page and static assets
export const config = {
  matcher: [
    // Exclude Next internals, API rate-limited separately, and all static assets in public/
    '/((?!_next|favicon.ico|logo.png|images|fonts|brand|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|woff|woff2|ttf|eot|otf|map)).*)',
  ],
}
