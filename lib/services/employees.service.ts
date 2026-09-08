import type { SupabaseClient } from '@supabase/supabase-js'
import type { Employee, EmployeeWithRole } from '@/lib/types/roles'

export class EmployeesService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Obtener todos los empleados con su información de rol
   */
  async getAll(): Promise<EmployeeWithRole[]> {
    const { data, error } = await this.client
      .from('employees')
      .select(`
        *,
        roles (role_name),
        role_permissions (
          permissions (name)
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(emp => ({
      ...emp,
      role_name: emp.roles?.role_name || 'Sin rol',
      permissions: emp.role_permissions
        ?.flatMap((rp: any) => rp.permissions?.name ? [rp.permissions.name] : []) || [],
    }))
  }

  /**
   * Obtener un empleado por ID
   */
  async getById(id: number): Promise<EmployeeWithRole> {
    const { data, error } = await this.client
      .from('employees')
      .select(`
        *,
        roles (role_name),
        role_permissions (
          permissions (name)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      ...data,
      role_name: data.roles?.role_name || 'Sin rol',
      permissions: data.role_permissions
        ?.flatMap((rp: any) => rp.permissions?.name ? [rp.permissions.name] : []) || [],
    }
  }

  /**
   * Obtener empleado por auth_id
   */
  async getByAuthId(authId: string): Promise<EmployeeWithRole | null> {
    const { data: employees, error } = await this.client
      .from('employees')
      .select(`
        *,
        roles (role_name),
        role_permissions (
          permissions (name)
        )
      `)
      .eq('auth_id', authId)
      .limit(1)

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
    if (!employees || employees.length === 0) return null

    const data = employees[0]

    return {
      ...data,
      role_name: data.roles?.role_name || 'Sin rol',
      permissions: data.role_permissions
        ?.flatMap((rp: any) => rp.permissions?.name ? [rp.permissions.name] : []) || [],
    }
  }

  /**
   * Crear un nuevo empleado
   */
  async create(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    const { data, error } = await this.client
      .from('employees')
      .insert([employee])
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Actualizar un empleado
   */
  async update(id: number, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await this.client
      .from('employees')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Cambiar rol de un empleado
   */
  async changeRole(employeeId: number, roleId: number): Promise<Employee> {
    return this.update(employeeId, { role_id: roleId })
  }

  /**
   * Cambiar estado de un empleado
   */
  async changeStatus(employeeId: number, status: 'active' | 'inactive' | 'suspended'): Promise<Employee> {
    return this.update(employeeId, { status })
  }

  /**
   * Eliminar un empleado (soft delete - cambiar estado a inactive)
   */
  async deactivate(employeeId: number): Promise<Employee> {
    return this.changeStatus(employeeId, 'inactive')
  }

  /**
   * Obtener empleados por rol
   */
  async getByRole(roleName: string): Promise<EmployeeWithRole[]> {
    const { data, error } = await this.client
      .from('employees')
      .select(`
        *,
        roles (role_name),
        role_permissions (
          permissions (name)
        )
      `)
      .eq('roles.role_name', roleName)
      .eq('status', 'active')

    if (error) throw error

    return (data || []).map(emp => ({
      ...emp,
      role_name: emp.roles?.role_name || 'Sin rol',
      permissions: emp.role_permissions
        ?.flatMap((rp: any) => rp.permissions?.name ? [rp.permissions.name] : []) || [],
    }))
  }

  /**
   * Búsqueda de empleados
   */
  async search(query: string): Promise<EmployeeWithRole[]> {
    const { data, error } = await this.client
      .from('employees')
      .select(`
        *,
        roles (role_name),
        role_permissions (
          permissions (name)
        )
      `)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('status', 'active')

    if (error) throw error

    return (data || []).map(emp => ({
      ...emp,
      role_name: emp.roles?.role_name || 'Sin rol',
      permissions: emp.role_permissions
        ?.flatMap((rp: any) => rp.permissions?.name ? [rp.permissions.name] : []) || [],
    }))
  }
}
