import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions, hasPermission } from '@/lib/permissions'
import type { Employee } from '@/lib/types/roles'

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
    if (!hasPermission(permissions, 'employees_view')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const role = searchParams.get('role')

    let query = supabase
      .from('employees')
      .select(`
        *,
        roles (role_name)
      `)
      .eq('status', 'active')

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (role) {
      query = query.eq('role_id', parseInt(role))
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Error fetching employees:', error)
    return Response.json(
      { error: error.message || 'Error fetching employees' },
      { status: 500 }
    )
  }
}

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
    if (!hasPermission(permissions, 'employees_create')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { first_name, last_name, email, phone, role_id, hire_date } = body

    // Validación básica
    if (!first_name || !last_name || !email || !role_id) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Crear empleado
    const { data: employee, error } = await supabase
      .from('employees')
      .insert([{
        first_name,
        last_name,
        email,
        phone,
        role_id,
        hire_date,
        status: 'active',
        created_by: session.user.id,
      }])
      .select()
      .single()

    if (error) throw error

    // Registrar en auditoría
    await supabase.from('audit_logs').insert([{
      user_id: session.user.id,
      action: 'CREATE',
      entity_type: 'employee',
      entity_id: employee.id,
      new_values: employee,
    }])

    return Response.json({
      success: true,
      data: employee,
    })
  } catch (error: any) {
    console.error('Error creating employee:', error)
    return Response.json(
      { error: error.message || 'Error creating employee' },
      { status: 500 }
    )
  }
}
