import type { SupabaseClient } from '@supabase/supabase-js'
import type { Role, Permission, RolePermission } from '@/lib/types/roles'

export class RolesService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Obtener todos los roles
   */
  async getAllRoles(): Promise<Role[]> {
    const { data, error } = await this.client
      .from('roles')
      .select('*')
      .order('role_name')

    if (error) throw error
    return data || []
  }

  /**
   * Obtener un rol por ID con sus permisos
   */
  async getRoleWithPermissions(roleId: number): Promise<any> {
    const { data, error } = await this.client
      .from('roles')
      .select(`
        *,
        role_permissions (
          permissions (*)
        )
      `)
      .eq('id', roleId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtener todos los permisos
   */
  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await this.client
      .from('permissions')
      .select('*')
      .order('module, action')

    if (error) throw error
    return data || []
  }

  /**
   * Obtener permisos por módulo
   */
  async getPermissionsByModule(module: string): Promise<Permission[]> {
    const { data, error } = await this.client
      .from('permissions')
      .select('*')
      .eq('module', module)
      .order('action')

    if (error) throw error
    return data || []
  }

  /**
   * Obtener permisos de un rol
   */
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const { data, error } = await this.client
      .from('role_permissions')
      .select('permissions (*)')
      .eq('role_id', roleId)

    if (error) throw error
    return (data || []).map((rp: any) => rp.permissions).filter(Boolean)
  }

  /**
   * Asignar permiso a un rol
   */
  async assignPermissionToRole(roleId: number, permissionId: number): Promise<RolePermission> {
    const { data, error } = await this.client
      .from('role_permissions')
      .insert([{ role_id: roleId, permission_id: permissionId }])
      .select()
      .single()

    if (error && error.code !== '23505') throw error // 23505 = unique constraint violation
    return data
  }

  /**
   * Remover permiso de un rol
   */
  async removePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    const { error } = await this.client
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId)

    if (error) throw error
  }

  /**
   * Actualizar múltiples permisos de un rol
   */
  async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    // Primero eliminar todos los permisos actuales
    await this.client
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    // Luego insertar los nuevos
    if (permissionIds.length > 0) {
      const { error } = await this.client
        .from('role_permissions')
        .insert(
          permissionIds.map(permissionId => ({
            role_id: roleId,
            permission_id: permissionId,
          }))
        )

      if (error) throw error
    }
  }

  /**
   * Crear un nuevo rol
   */
  async createRole(role: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
    const { data, error } = await this.client
      .from('roles')
      .insert([role])
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Actualizar un rol
   */
  async updateRole(roleId: number, updates: Partial<Role>): Promise<Role> {
    const { data, error } = await this.client
      .from('roles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Agrupar permisos por módulo
   */
  groupPermissionsByModule(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = []
      }
      acc[perm.module].push(perm)
      return acc
    }, {} as Record<string, Permission[]>)
  }
}
