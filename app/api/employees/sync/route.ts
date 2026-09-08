import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions, hasPermission } from '@/lib/permissions'

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
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = await getUserPermissions(supabase, session.user.id)
    if (!hasPermission(permissions, 'employees_create')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Obtener todos los usuarios de Supabase Auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) throw usersError

    // Obtener empleados existentes
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('auth_id')

    if (empError) throw empError

    const existingAuthIds = new Set(employees?.map((e: any) => e.auth_id) || [])

    // Sincronizar usuarios no registrados como empleados
    const usersToSync = users.filter(user => !existingAuthIds.has(user.id))

    if (usersToSync.length === 0) {
      return Response.json({
        success: true,
        message: 'Todos los usuarios ya están sincronizados',
        synced: 0,
        users: [],
      })
    }

    // Obtener rol por defecto (Vendedor)
    const { data: defaultRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', 'Vendedor')
      .single()

    if (roleError) throw roleError

    // Crear registros de empleados para usuarios nuevos
    const syncedUsers = usersToSync.map((user: any) => {
      const [firstName, ...lastNameParts] = (user.user_metadata?.full_name || user.email).split(' ')
      return {
        auth_id: user.id,
        first_name: firstName || 'Usuario',
        last_name: lastNameParts.join(' ') || user.email.split('@')[0],
        email: user.email,
        role_id: defaultRole.id,
        status: 'active',
      }
    })

    const { data: inserted, error: insertError } = await supabase
      .from('employees')
      .insert(syncedUsers)
      .select()

    if (insertError) throw insertError

    return Response.json({
      success: true,
      message: `${inserted?.length || 0} usuarios sincronizados exitosamente`,
      synced: inserted?.length || 0,
      users: inserted || [],
    })
  } catch (error: any) {
    console.error('Error syncing users:', error)
    return Response.json(
      { error: error.message || 'Error sincronizando usuarios' },
      { status: 500 }
    )
  }
}
