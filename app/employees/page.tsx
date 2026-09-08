import { redirect } from "next/navigation"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions, hasPermission } from "@/lib/permissions"
import { EmployeesClient } from "./employees-client"

async function getEmployees() {
  const cookieStore = await cookies()
  const sb = createServerClient(
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

  const { data: { session } } = await sb.auth.getSession()
  if (!session) redirect("/login")

  const permissions = await getUserPermissions(sb, session.user.id)

  const isAllowed = 
    permissions.role === 'Superadministrador' ||
    permissions.role === 'Gerente' ||
    hasPermission(permissions, 'employees_view')

  if (!isAllowed) {
    redirect("/")
  }

  const { data: employees, error } = await sb
    .from('employees')
    .select(`
      *,
      roles (role_name)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getEmployees] Error fetching employees:', error)
    throw error
  }

  console.log(`[getEmployees] Fetched ${employees?.length || 0} employees`)

  return {
    employees: employees || [],
    isAdmin: hasPermission(permissions, 'employees_create'),
  }
}

export default async function EmployeesPage() {
  const { employees, isAdmin } = await getEmployees()

  return <EmployeesClient employees={employees} isAdmin={isAdmin} />
}
