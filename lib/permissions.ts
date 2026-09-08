import type { SupabaseClient } from '@supabase/supabase-js'

export type UserRole = 'Superadministrador' | 'Vendedor' | 'Gerente' | 'Controlador' | 'custom'

export interface UserPermissions {
  userId: string
  employeeId: number | null
  email: string
  firstName: string
  lastName: string
  role: UserRole
  permissions: string[]
  status: 'active' | 'inactive' | 'suspended'
}

/**
 * Obtener permisos del usuario desde la base de datos
 */
export async function getUserPermissions(
  client: SupabaseClient,
  userId: string
): Promise<UserPermissions> {
  try {
    console.log(`[getUserPermissions] Getting permissions for user: ${userId}`)

    // Estrategia 1: Buscar por auth_id (nuevo sistema)
    const { data: employees, error: employeeError } = await client
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        email,
        status,
        role_id,
        roles (role_name)
      `)
      .eq('auth_id', userId)
      .limit(1)

    console.log(`[getUserPermissions] Query result - error: ${employeeError?.message}, employees: ${employees?.length}`)

    let employee = null
    if (employees && employees.length > 0) {
      employee = employees[0]
    }

    if (!employee) {
      console.warn(`[getUserPermissions] No employee found for user ${userId}`)
      return getDefaultUserPermissions(userId)
    }

    // Verificar que el usuario esté activo
    if (employee.status !== 'active') {
      console.warn(`[getUserPermissions] Employee is not active: ${employee.status}`)
      return getDefaultUserPermissions(userId)
    }

    // Obtener permisos por separado
    const { data: rolePermissions, error: permsError } = await client
      .from('role_permissions')
      .select(`
        permissions (name)
      `)
      .eq('role_id', employee.role_id)

    if (permsError) {
      console.warn(`[getUserPermissions] Error getting permissions: ${permsError?.message}`)
      return getDefaultUserPermissions(userId)
    }

    const permissions = rolePermissions
      ?.flatMap((rp: any) => rp.permissions?.name ? [rp.permissions.name] : []) || []

    let roleName: UserRole = 'custom'
    if (employee.roles) {
      if (Array.isArray(employee.roles) && employee.roles.length > 0) {
        roleName = (employee.roles[0] as any)?.role_name || 'custom'
      } else if (!Array.isArray(employee.roles)) {
        roleName = (employee.roles as any)?.role_name || 'custom'
      }
    }

    const result = {
      userId,
      employeeId: employee.id,
      email: employee.email,
      firstName: employee.first_name,
      lastName: employee.last_name,
      role: roleName,
      permissions: [...new Set(permissions)],
      status: employee.status,
    }

    console.log(`[getUserPermissions] SUCCESS - user: ${result.email}, role: ${result.role}, perms: ${result.permissions.length}`)

    return result
  } catch (error) {
    console.warn(`[getUserPermissions] Exception:`, error)
    return getDefaultUserPermissions(userId)
  }
}

function getDefaultUserPermissions(userId: string): UserPermissions {
  return {
    userId,
    employeeId: null,
    email: '',
    firstName: '',
    lastName: '',
    role: 'custom',
    permissions: [],
    status: 'inactive',
  }
}

/**
 * Verificar si el usuario tiene un permiso específico
 */
export function hasPermission(
  permissions: UserPermissions,
  permissionName: string
): boolean {
  return permissions.permissions.includes(permissionName)
}

/**
 * Verificar si el usuario tiene acceso a un módulo
 */
export function hasModuleAccess(
  permissions: UserPermissions,
  module: string
): boolean {
  return permissions.permissions.some(p => p.includes(module))
}

/**
 * Filtrar datos según el usuario (para cuando sea necesario)
 */
export function filterDataByUser<T extends Record<string, any>>(
  data: T[],
  userId: string
): T[] {
  // En el nuevo sistema, la filtración se hace en BD con RLS
  // Esta función se mantiene por compatibilidad
  return data
}

/**
 * Verificar si el usuario puede realizar una acción sobre un módulo
 */
export function canPerformAction(
  permissions: UserPermissions,
  module: string,
  action: 'view' | 'create' | 'edit' | 'delete'
): boolean {
  const permissionName = `${module}_${action}`
  return hasPermission(permissions, permissionName)
}

/**
 * Filtrar datos según permisos del usuario
 * En el nuevo sistema, la filtración debe hacerse en BD con RLS
 * Esta función se mantiene por compatibilidad legacy
 */
export function filterDataByPermissions<T extends Record<string, any>>(
  data: T[],
  userId: string,
  permissions: UserPermissions
): T[] {
  // Filtración legacy: si el usuario no es superadmin/gerente, filtrar por user_id
  if (!['Superadministrador', 'Gerente'].includes(permissions.role) && data.length > 0) {
    return data.filter(item => !item.user_id || item.user_id === userId)
  }
  return data
}
