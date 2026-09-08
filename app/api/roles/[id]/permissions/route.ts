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
    if (!hasPermission(permissions, 'permissions_assign')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Obtener permisos asignados a este rol
    const { data: rolePermissions, error } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', parseInt(id))

    if (error) throw error

    return Response.json({
      success: true,
      assigned: rolePermissions?.map(rp => rp.permission_id) || [],
    })
  } catch (error: any) {
    console.error('Error fetching role permissions:', error)
    return Response.json(
      { error: error.message || 'Error fetching role permissions' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    if (!hasPermission(permissions, 'permissions_assign')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { permissions: newPermissions } = await request.json()

    // Eliminar permisos existentes
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', parseInt(id))

    // Insertar nuevos permisos
    if (newPermissions && newPermissions.length > 0) {
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(
          newPermissions.map((permissionId: number) => ({
            role_id: parseInt(id),
            permission_id: permissionId,
          }))
        )

      if (insertError) throw insertError
    }

    // Registrar en auditoría
    await supabase.from('audit_logs').insert([{
      user_id: session.user.id,
      action: 'UPDATE',
      entity_type: 'role_permissions',
      entity_id: parseInt(id),
      new_values: { permissions: newPermissions },
    }])

    return Response.json({
      success: true,
      message: 'Permisos actualizados correctamente',
    })
  } catch (error: any) {
    console.error('Error updating role permissions:', error)
    return Response.json(
      { error: error.message || 'Error updating role permissions' },
      { status: 500 }
    )
  }
}
