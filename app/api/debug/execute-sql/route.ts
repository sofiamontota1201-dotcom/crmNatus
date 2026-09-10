import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
      action,
      results: {}
    }

    if (action === 'analyze-invoices') {
      // Get details with product info for specific sell IDs
      const { sellIds } = body

      // 1. Get all sell details with product info for these sell IDs
      const { data: details } = await supabase
        .from('sell_details')
        .select(`
          id, sell_id, stock_id, sold_quantity, sold_price, total_sold_price, buy_price, total_buy_price, discount, discount_amount,
          stock:stocks (
            id, product_code, current_quantity, buying_price, selling_price,
            product:products ( id, product_name )
          )
        `)
        .in('sell_id', sellIds || [4245,4246,4247,4248,4249,4250,4251])
        .order('sell_id', { ascending: true })

      // 2. Get sell records
      const { data: sells } = await supabase
        .from('sells')
        .select('id, total_amount, discount_amount, sell_date, payment_status, payment_method, branch_id, created_at, customer_id')
        .in('id', sellIds || [4245,4246,4247,4248,4249,4250,4251])
        .order('id', { ascending: true })

      // 3. Get ALL sell_details ever created with stock_id 1711
      const { data: allStock1711Details } = await supabase
        .from('sell_details')
        .select('id, sell_id, stock_id, sold_quantity, sold_price, total_sold_price, created_at')
        .eq('stock_id', 1711)
        .order('sell_id', { ascending: true })

      // 4. Check current stock of stock_id 1711
      const { data: stock1711 } = await supabase
        .from('stocks')
        .select('id, product_code, current_quantity, buying_price, selling_price, status')
        .eq('id', 1711)
        .single()

      // 5. Check ALL sell_details for these sell IDs (to see if there were others that got deleted)
      const { data: allDetailsForSells } = await supabase
        .from('sell_details')
        .select('id, sell_id, stock_id, sold_quantity, sold_price, total_sold_price, created_at')
        .in('sell_id', sellIds || [4245,4246,4247,4248,4249,4250,4251])
        .order('sell_id', { ascending: true })

      results.results = {
        sells: sells || [],
        details_with_products: details || [],
        all_details_for_sells: allDetailsForSells || [],
        stock_1711_history: allStock1711Details || [],
        stock_1711_current: stock1711,
      }
    }
    else if (action === 'verify') {
      // 1. Contar permisos
      const { count: permsCount } = await supabase
        .from('permissions')
        .select('*', { count: 'exact', head: true })

      results.results.permisos_totales = permsCount || 0

      // 2. Contar roles
      const { data: roles } = await supabase
        .from('roles')
        .select('*')

      results.results.roles_totales = roles?.length || 0
      results.results.roles = roles || []

      // 3. Permisos por rol
      results.results.permisos_por_rol = {}
      for (const role of roles || []) {
        const { count } = await supabase
          .from('role_permissions')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)
        
        results.results.permisos_por_rol[role.role_name] = count || 0
      }

      // 4. Empleados
      const { data: employees, count: empCount } = await supabase
        .from('employees')
        .select('*, roles(role_name)', { count: 'exact' })
        .order('created_at', { ascending: false })

      results.results.empleados_totales = empCount || 0
      results.results.empleados_activos = employees?.filter(e => e.status === 'active').length || 0
      results.results.empleados = employees?.map(e => ({
        id: e.id,
        nombre: `${e.first_name} ${e.last_name}`,
        email: e.email,
        rol: e.roles?.role_name,
        estado: e.status
      })) || []

      // 5. Usuario específico
      const user = employees?.find(e => e.email === 'alejogonzalez3111@gmail.com')
      results.results.usuario_alejogonzalez = {
        encontrado: !!user,
        id: user?.id,
        nombre: user ? `${user.first_name} ${user.last_name}` : null,
        email: user?.email,
        rol: user?.roles?.role_name,
        estado: user?.status,
        auth_id: user?.auth_id
      }

      // 6. Permisos del usuario
      if (user) {
        const { data: userPerms } = await supabase
          .from('role_permissions')
          .select('permissions(name)')
          .eq('role_id', user.role_id)

        results.results.usuario_alejogonzalez.permisos_totales = userPerms?.length || 0
        results.results.usuario_alejogonzalez.permisos = userPerms?.map((rp: any) => rp.permissions?.name) || []
      }
    } 
    else if (action === 'assign-superadmin') {
      // Obtener UUID del usuario
      const { data: authUser } = await supabase.auth.admin.getUserById('a9b8e909-684f-4c8c-905a-1c59bab74094')
      
      if (!authUser?.user) {
        return Response.json({
          status: 'error',
          message: 'Usuario no encontrado en Auth'
        }, { status: 400 })
      }

      // Obtener rol Superadministrador
      const { data: superadminRole } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'Superadministrador')
        .single()

      if (!superadminRole) {
        return Response.json({
          status: 'error',
          message: 'Rol Superadministrador no encontrado'
        }, { status: 400 })
      }

      // Actualizar o crear empleado
      const { data: updated, error } = await supabase
        .from('employees')
        .upsert({
          auth_id: authUser.user.id,
          first_name: 'Administrador',
          last_name: 'Principal',
          email: 'alejogonzalez3111@gmail.com',
          role_id: superadminRole.id,
          status: 'active'
        }, { onConflict: 'auth_id' })
        .select('*, roles(role_name)')
        .single()

      if (error) {
        return Response.json({
          status: 'error',
          message: error.message
        }, { status: 400 })
      }

      results.results.success = true
      results.results.usuario = {
        id: updated.id,
        nombre: `${updated.first_name} ${updated.last_name}`,
        email: updated.email,
        rol: updated.roles?.role_name,
        estado: updated.status
      }

      // Obtener permisos asignados
      const { data: userPerms } = await supabase
        .from('role_permissions')
        .select('permissions(name)')
        .eq('role_id', updated.role_id)

      results.results.usuario.permisos_asignados = userPerms?.length || 0
    }

    return Response.json(results)
  } catch (error: any) {
    console.error('Error executing SQL:', error)
    return Response.json(
      { 
        status: 'error', 
        error: error.message || 'Error executing SQL',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
