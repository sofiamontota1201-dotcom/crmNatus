import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions, hasPermission } from '@/lib/permissions'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    if (!hasPermission(permissions, 'employees_view')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        roles (*)
      `)
      .eq('id', parseInt(id))
      .single()

    if (error) throw error

    return Response.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Error fetching employee:', error)
    return Response.json(
      { error: error.message || 'Error fetching employee' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const { first_name, last_name, email, phone, role_id, status, cedula } = body

    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (first_name) updates.first_name = first_name
    if (last_name) updates.last_name = last_name
    if (email) updates.email = email
    if (phone !== undefined) updates.phone = phone
    if (cedula !== undefined) updates.cedula = cedula
    if (role_id) updates.role_id = role_id
    if (status) updates.status = status

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) throw error

    // Registrar en auditoría
    await supabase.from('audit_logs').insert([{
      user_id: session.user.id,
      action: 'UPDATE',
      entity_type: 'employee',
      entity_id: parseInt(id),
      new_values: data,
    }])

    return Response.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Error updating employee:', error)
    return Response.json(
      { error: error.message || 'Error updating employee' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    if (!hasPermission(permissions, 'employees_delete')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete - solo cambiar estado a inactive
    const { data, error } = await supabase
      .from('employees')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) throw error

    // Registrar en auditoría
    await supabase.from('audit_logs').insert([{
      user_id: session.user.id,
      action: 'DELETE',
      entity_type: 'employee',
      entity_id: parseInt(id),
    }])

    return Response.json({
      success: true,
      message: 'Empleado eliminado correctamente',
    })
  } catch (error: any) {
    console.error('Error deleting employee:', error)
    return Response.json(
      { error: error.message || 'Error deleting employee' },
      { status: 500 }
    )
  }
}
