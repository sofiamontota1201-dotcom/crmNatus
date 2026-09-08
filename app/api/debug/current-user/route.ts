import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (!session) {
      return Response.json({ 
        error: 'No session found',
        message: 'Usuario no autenticado'
      }, { status: 401 })
    }

    // Obtener usuario actual desde Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    return Response.json({
      session: {
        user_id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at,
      },
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      } : null,
      userError: userError?.message,
    })
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
