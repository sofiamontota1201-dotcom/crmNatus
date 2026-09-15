import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions, hasPermission } from "@/lib/permissions"
import Link from "next/link"
import { RolesPermissionsClient } from "./roles-permissions-client"

async function getRolesAndPermissions() {
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

  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect("/login")

  const permissions = await getUserPermissions(sb, user.id)

  // Permitir acceso si es admin
  const isAllowed =
    permissions.role === 'Superadministrador' ||
    permissions.role === 'Gerente' ||
    permissions.role === 'admin' ||
    hasPermission(permissions, 'roles_view')

  if (!isAllowed) {
    redirect("/")
  }

  // Obtener roles
  const { data: allRoles } = await sb.from('roles').select('*').order('role_name')

  // Filtrar roles según el nivel del usuario actual
  const privilegedRoles = ['Superadministrador', 'Gerente', 'admin']
  const isPrivileged = privilegedRoles.includes(permissions.role)
  let visibleRoles = allRoles || []

  if (!isPrivileged) {
    if (permissions.role === 'Vendedor' || permissions.role === 'vendedor') {
      visibleRoles = visibleRoles.filter(r => r.role_name === 'Vendedor' || r.role_name === 'vendedor')
    } else if (permissions.role === 'Controlador') {
      visibleRoles = visibleRoles.filter(r => r.role_name === 'Controlador')
    } else if (permissions.role === 'bodeguero') {
      visibleRoles = visibleRoles.filter(r => r.role_name === 'bodeguero')
    }
  }

  // Obtener empleados con sus roles
  const { data: employees } = await sb
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email,
      role_id,
      roles (role_name)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Filtrar empleados si no es un rol privilegiado
  let visibleEmployees = employees || []
  if (!isPrivileged) {
    visibleEmployees = visibleEmployees.filter(e => e.role_id === (allRoles?.find(r => r.role_name === permissions.role)?.id))
  }

  return {
    roles: visibleRoles,
    employees: visibleEmployees,
    isAdmin: hasPermission(permissions, 'roles_edit'),
    canAssignPermissions: hasPermission(permissions, 'permissions_assign'),
    userRole: permissions.role,
  }
}

export default async function RolesPermissionsPage() {
  const { roles, employees, isAdmin, canAssignPermissions, userRole } = await getRolesAndPermissions()

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Navigation />
      
      <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto scrollbar-thin text-gray-900">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              Gestión de Roles y Permisos
            </h1>
            <p className="text-gray-600 mt-1">
              {userRole === 'Superadministrador'
                ? 'Tienes acceso a todos los roles'
                : userRole === 'Gerente'
                ? 'Puedes gestionar todos excepto Superadministrador'
                : `Solo puedes ver empleados con rol ${userRole}`
              }
            </p>
          </div>
          {isAdmin && (
            <Link href="/employees">
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2">
                <Plus className="w-4 h-4" />
                Ver Empleados
              </Button>
            </Link>
          )}
        </div>

        {/* Cliente component para gestionar empleados y permisos */}
        <RolesPermissionsClient 
          employees={employees}
          roles={roles}
          isAdmin={isAdmin}
          canAssignPermissions={canAssignPermissions}
        />
      </main>
    </div>
  )
}
