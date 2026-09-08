'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { X, Loader2 } from 'lucide-react'

interface PermissionsModalProps {
  roleId: number
  roleName: string
  onClose: () => void
  onSave: () => void
}

interface Permission {
  id: number
  name: string
  module: string
  action: string
  description: string
}

interface PermissionsByModule {
  [key: string]: Permission[]
}

const moduleIcons: Record<string, string> = {
  dashboard: '📊',
  sales: '💰',
  customers: '👥',
  prospects: '🎯',
  inventory: '📦',
  employees: '👨‍💼',
  roles: '🔐',
  permissions: '🛡️',
  reports: '📈',
}

export function PermissionsModal({ roleId, roleName, onClose, onSave }: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [assignedPermissions, setAssignedPermissions] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/debug/verify-permissions`)
      const data = await response.json()
      
      // Fetch all permissions
      const permsResponse = await fetch(`/api/roles/${roleId}/permissions`)
      const permsData = await permsResponse.json()
      
      // Para este MVP, obtenemos permisos del cliente
      setPermissions([
        { id: 1, name: 'dashboard_admin_view', module: 'dashboard', action: 'view', description: 'Ver dashboard administrativo' },
        { id: 2, name: 'dashboard_sales_view', module: 'dashboard', action: 'view', description: 'Ver dashboard de ventas' },
        { id: 3, name: 'pos_view', module: 'sales', action: 'view', description: 'Acceder al POS' },
        { id: 4, name: 'pos_create', module: 'sales', action: 'create', description: 'Crear ventas en POS' },
        { id: 5, name: 'sales_view', module: 'sales', action: 'view', description: 'Ver historial de ventas' },
        { id: 6, name: 'sales_edit', module: 'sales', action: 'edit', description: 'Editar ventas' },
        { id: 7, name: 'sales_delete', module: 'sales', action: 'delete', description: 'Eliminar ventas' },
        { id: 8, name: 'customers_view', module: 'customers', action: 'view', description: 'Ver clientes' },
        { id: 9, name: 'customers_create', module: 'customers', action: 'create', description: 'Crear clientes' },
        { id: 10, name: 'customers_edit', module: 'customers', action: 'edit', description: 'Editar clientes' },
        { id: 11, name: 'customers_delete', module: 'customers', action: 'delete', description: 'Eliminar clientes' },
        { id: 12, name: 'prospects_view', module: 'prospects', action: 'view', description: 'Ver prospects' },
        { id: 13, name: 'prospects_create', module: 'prospects', action: 'create', description: 'Crear prospects' },
        { id: 14, name: 'prospects_edit', module: 'prospects', action: 'edit', description: 'Editar prospects' },
        { id: 15, name: 'prospects_delete', module: 'prospects', action: 'delete', description: 'Eliminar prospects' },
        { id: 16, name: 'inventory_view', module: 'inventory', action: 'view', description: 'Ver inventario' },
        { id: 17, name: 'inventory_create', module: 'inventory', action: 'create', description: 'Crear productos' },
        { id: 18, name: 'inventory_edit', module: 'inventory', action: 'edit', description: 'Editar productos' },
        { id: 19, name: 'inventory_delete', module: 'inventory', action: 'delete', description: 'Eliminar productos' },
        { id: 20, name: 'employees_view', module: 'employees', action: 'view', description: 'Ver empleados' },
        { id: 21, name: 'employees_create', module: 'employees', action: 'create', description: 'Crear empleados' },
        { id: 22, name: 'employees_edit', module: 'employees', action: 'edit', description: 'Editar empleados' },
        { id: 23, name: 'employees_delete', module: 'employees', action: 'delete', description: 'Eliminar empleados' },
        { id: 24, name: 'roles_view', module: 'roles', action: 'view', description: 'Ver roles' },
        { id: 25, name: 'roles_create', module: 'roles', action: 'create', description: 'Crear roles' },
        { id: 26, name: 'roles_edit', module: 'roles', action: 'edit', description: 'Editar roles' },
        { id: 27, name: 'roles_delete', module: 'roles', action: 'delete', description: 'Eliminar roles' },
        { id: 28, name: 'permissions_view', module: 'permissions', action: 'view', description: 'Ver permisos' },
        { id: 29, name: 'permissions_assign', module: 'permissions', action: 'edit', description: 'Asignar permisos a roles' },
        { id: 30, name: 'reports_view', module: 'reports', action: 'view', description: 'Ver reportes' },
      ])
      
      setAssignedPermissions(permsData.assigned || [])
    } catch (error) {
      console.error('Error fetching permissions:', error)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (permissionId: number) => {
    setAssignedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: assignedPermissions }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar permisos')
      }

      toast({
        title: 'Éxito',
        description: `Permisos de ${roleName} actualizados correctamente`,
      })

      onSave()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const permissionsByModule: PermissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = []
    }
    acc[perm.module].push(perm)
    return acc
  }, {} as PermissionsByModule)

  const modules = Object.keys(permissionsByModule).sort()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel border border-white/10 rounded-2xl max-w-4xl w-full bg-black/40 my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-white/5">
          <div>
            <h2 className="text-2xl font-bold text-white">Permisos del Rol</h2>
            <p className="text-sm text-gray-400 mt-1">{roleName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 max-h-96 overflow-y-auto scrollbar-thin">
              {modules.map(module => (
                <div key={module} className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {moduleIcons[module]} {module.charAt(0).toUpperCase() + module.slice(1)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                    {permissionsByModule[module].map(perm => (
                      <label key={perm.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group">
                        <Checkbox
                          checked={assignedPermissions.includes(perm.id)}
                          onCheckedChange={() => handlePermissionToggle(perm.id)}
                          disabled={saving}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200 group-hover:text-white">
                            {perm.action.charAt(0).toUpperCase() + perm.action.slice(1)}
                          </p>
                          <p className="text-xs text-gray-500">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-8 border-t border-white/5 bg-black/20">
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Permisos'
            )}
          </Button>
          <Button
            onClick={onClose}
            disabled={saving}
            variant="outline"
            className="border-white/10 hover:bg-white/5 text-gray-300"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
