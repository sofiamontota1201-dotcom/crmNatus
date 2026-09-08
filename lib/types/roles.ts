export interface Role {
  id: number
  role_name: string
  description: string
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  name: string
  description: string
  module: string
  action: 'view' | 'create' | 'edit' | 'delete'
  created_at: string
}

export interface RolePermission {
  id: number
  role_id: number
  permission_id: number
  created_at: string
}

export interface Employee {
  id: number
  auth_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  role_id: number
  status: 'active' | 'inactive' | 'suspended'
  hire_date?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Relations
  roles?: Role
  role_permissions?: RolePermission[]
}

export interface EmployeeWithRole extends Employee {
  role_name: string
  permissions: string[]
}

export interface AuditLog {
  id: number
  user_id: string
  action: string
  entity_type: string
  entity_id: number
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}
