import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    const results: any = {
      timestamp: new Date().toISOString(),
      status: 'success',
      data: {}
    }

    // 1. Contar permisos
    const { data: perms, error: permsError } = await supabase
      .from('permissions')
      .select('*', { count: 'exact', head: true })

    results.data.permisos_totales = perms?.length || 0
    if (permsError) results.data.permisos_error = permsError.message

    // 2. Contar roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')

    results.data.roles_totales = roles?.length || 0
    results.data.roles = roles || []
    if (rolesError) results.data.roles_error = rolesError.message

    // 3. Permisos por rol
    results.data.permisos_por_rol = {}
    for (const role of roles || []) {
      const { data: rolePerms, error } = await supabase
        .from('role_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
      
      results.data.permisos_por_rol[role.role_name] = rolePerms?.length || 0
    }

    // 4. Empleados totales
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*, roles(role_name)')
      .order('created_at', { ascending: false })

    results.data.empleados_totales = employees?.length || 0
    results.data.empleados_activos = employees?.filter(e => e.status === 'active').length || 0
    results.data.empleados_inactivos = employees?.filter(e => e.status === 'inactive').length || 0
    if (empError) results.data.empleados_error = empError.message

    // 5. Listar empleados
    results.data.empleados = employees?.map(e => ({
      id: e.id,
      nombre: `${e.first_name} ${e.last_name}`,
      email: e.email,
      rol: e.roles?.role_name || 'Sin rol',
      estado: e.status,
      auth_id: e.auth_id ? 'vinculado' : 'no_vinculado'
    })) || []

    // 6. Usuario específico
    const user = employees?.find(e => e.email === 'alejogonzalez3111@gmail.com')
    results.data.usuario_alejogonzalez = {
      encontrado: !!user,
      id: user?.id || null,
      nombre: user ? `${user.first_name} ${user.last_name}` : null,
      email: user?.email || null,
      rol: user?.roles?.role_name || null,
      estado: user?.status || null,
      auth_id: user?.auth_id || null
    }

    // 7. Permisos del usuario
    if (user) {
      const { data: userPerms, error: userPermsError } = await supabase
        .from('role_permissions')
        .select('permissions(name, module, action)')
        .eq('role_id', user.role_id)

      results.data.usuario_alejogonzalez.permisos_totales = userPerms?.length || 0
      results.data.usuario_alejogonzalez.permisos = userPerms?.map((rp: any) => ({
        nombre: rp.permissions?.name,
        modulo: rp.permissions?.module,
        accion: rp.permissions?.action
      })) || []
      
      if (userPermsError) {
        results.data.usuario_alejogonzalez.permisos_error = userPermsError.message
      }
    }

    return Response.json(results)
  } catch (error: any) {
    console.error('Error verifying permissions:', error)
    return Response.json(
      { 
        status: 'error', 
        error: error.message || 'Error verifying permissions',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
