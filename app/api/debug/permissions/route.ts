import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions } from '@/lib/permissions'

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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return Response.json({ error: 'No session' }, { status: 401 })
    }

    const userId = session.user.id
    const email = session.user.email

    // Obtener permisos
    const permissions = await getUserPermissions(supabase, userId)

    // Obtener empleado directamente
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        email,
        auth_id,
        status,
        role_id,
        roles (role_name)
      `)
      .eq('auth_id', userId)
      .single()

    // Obtener todos los empleados para debug
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, email, auth_id, role_id')
      .limit(5)

    return Response.json({
      session: {
        user_id: userId,
        email: email,
      },
      permissions,
      employee,
      employeeError: empError?.message,
      allEmployees: allEmployees,
    })
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
