import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions } from '@/lib/permissions'

export async function GET() {
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener permisos del usuario actual
    const permissions = await getUserPermissions(supabase, session.user.id)

    return Response.json({
      success: true,
      data: {
        userId: session.user.id,
        email: session.user.email,
        permissions: permissions.permissions,
        role: permissions.role,
        status: permissions.status,
      }
    })
  } catch (error: any) {
    console.error('Error getting user permissions:', error)
    return Response.json(
      { error: error.message || 'Error getting user permissions' },
      { status: 500 }
    )
  }
}
