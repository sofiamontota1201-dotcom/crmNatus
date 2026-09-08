import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions, hasPermission } from '@/lib/permissions'

export async function POST(request: Request) {
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
    if (!hasPermission(permissions, 'employees_edit')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role_name } = body

    if (!email || !role_name) {
      return Response.json(
        { error: 'Email and role_name are required' },
        { status: 400 }
      )
    }

    // Obtener el rol por su nombre
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', role_name)
      .single()

    if (roleError || !role) {
      return Response.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Actualizar el empleado con el nuevo rol
    const { data: employee, error: updateError } = await supabase
      .from('employees')
      .update({
        role_id: role.id,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email)
      .select(`
        *,
        roles (role_name)
      `)
      .single()

    if (updateError) throw updateError

    // Registrar en auditoría
    await supabase.from('audit_logs').insert([{
      user_id: session.user.id,
      action: 'UPDATE',
      entity_type: 'employee',
      entity_id: employee.id,
      new_values: { role_id: role.id, role_name },
    }])

    return Response.json({
      success: true,
      message: `Rol "${role_name}" asignado a ${email}`,
      data: employee,
    })
  } catch (error: any) {
    console.error('Error assigning role:', error)
    return Response.json(
      { error: error.message || 'Error assigning role' },
      { status: 500 }
    )
  }
}
