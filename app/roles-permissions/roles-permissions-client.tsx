'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Settings } from "lucide-react"
import { RoleChangeForm } from "./role-change-form"
import { PermissionsModal } from "./permissions-modal"

interface RolesPermissionsClientProps {
  employees: any[]
  roles: any[]
  isAdmin: boolean
  canAssignPermissions: boolean
}

const roleColors: Record<string, { badge: string; icon: string }> = {
  'Superadministrador': { badge: 'bg-red-50 border-red-200 text-red-700', icon: '👑' },
  'admin': { badge: 'bg-red-50 border-red-200 text-red-700', icon: '👑' },
  'Gerente': { badge: 'bg-orange-50 border-orange-200 text-orange-700', icon: '⭐' },
  'Vendedor': { badge: 'bg-blue-50 border-blue-200 text-blue-700', icon: '💼' },
  'vendedor': { badge: 'bg-blue-50 border-blue-200 text-blue-700', icon: '💼' },
  'Controlador': { badge: 'bg-purple-50 border-purple-200 text-purple-700', icon: '📊' },
  'bodeguero': { badge: 'bg-amber-50 border-amber-200 text-amber-700', icon: '📦' },
}

export function RolesPermissionsClient({ 
  employees, 
  roles, 
  isAdmin, 
  canAssignPermissions 
}: RolesPermissionsClientProps) {
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
  const [editingRoleName, setEditingRoleName] = useState<string>('')

  const handleEditPermissions = (roleId: number, roleName: string) => {
    setEditingRoleId(roleId)
    setEditingRoleName(roleName)
  }

  const handleCloseModal = () => {
    setEditingRoleId(null)
    setEditingRoleName('')
  }

  return (
    <>
      {/* Tabla de empleados */}
      <Card className="border-gray-200 bg-white mb-8">
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay empleados que puedas gestionar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Empleado</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Rol Actual</th>
                    {isAdmin && roles.length > 1 && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Cambiar Rol</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{emp.first_name}</p>
                          <p className="text-sm text-gray-600">{emp.last_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{emp.email}</td>
                      <td className="px-6 py-4">
                        <Badge
                          className={`border ${roleColors[emp.roles?.role_name]?.badge || 'bg-gray-100 border-gray-200 text-gray-600'}`}
                        >
                          {roleColors[emp.roles?.role_name]?.icon} {emp.roles?.role_name}
                        </Badge>
                      </td>
                      {isAdmin && roles.length > 1 && (
                        <td className="px-6 py-4">
                          <RoleChangeForm 
                            employeeId={emp.id}
                            employeeEmail={emp.email}
                            currentRoleId={emp.role_id}
                            roles={roles}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gestión de Permisos por Rol */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Configuración de Roles y Permisos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role: any) => {
            const empCount = employees.filter((e: any) => e.role_id === role.id).length
            return (
              <Card key={role.id} className="border-gray-200 bg-white hover:border-primary/30 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-2xl">{roleColors[role.role_name]?.icon || '📋'}</div>
                    <Badge className={`${roleColors[role.role_name]?.badge || 'bg-gray-100 border-gray-200 text-gray-600'} border text-xs`}>
                      {empCount}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900">{role.role_name}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{role.description}</p>
                  
                  {canAssignPermissions && (
                    <Button
                      onClick={() => handleEditPermissions(role.id, role.role_name)}
                      className="w-full mt-4 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:border-primary/50 text-xs gap-1 transition-all"
                    >
                      <Settings className="w-3 h-3" />
                      Permisos
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Modal de permisos */}
      {editingRoleId && (
        <PermissionsModal
          roleId={editingRoleId}
          roleName={editingRoleName}
          onClose={handleCloseModal}
          onSave={handleCloseModal}
        />
      )}
    </>
  )
}
