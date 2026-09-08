'use client'

import { useState } from 'react'
import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Plus, Edit2, Trash2, Search } from "lucide-react"
import Link from "next/link"
import { SyncButton } from "./sync-button"
import { EditForm } from "./edit-form"
import { motion, AnimatePresence } from "framer-motion"

interface EmployeesClientProps {
  employees: any[]
  isAdmin: boolean
}

export function EmployeesClient({ employees: initialEmployees, isAdmin }: EmployeesClientProps) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [editingEmployee, setEditingEmployee] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleEditSave = () => {
    setEditingEmployee(null)
    window.location.reload()
  }

  const filteredEmployees = employees.filter(emp =>
    emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.cedula && emp.cedula.includes(searchTerm))
  )

  const statusConfig: Record<string, { badge: string; color: string }> = {
    active: { badge: 'EMPLEADO ACTIVO', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
    inactive: { badge: 'INACTIVO', color: 'bg-gray-500/10 border-gray-500/20 text-gray-400' },
    suspended: { badge: 'SUSPENDIDO', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      <Navigation />
      
      <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto scrollbar-thin text-gray-900">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              Gestión de Empleados
            </h1>
            <p className="text-gray-400 mt-1">Administra tu equipo de trabajo</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <SyncButton />
                <Link href="/roles-permissions/create-employee">
                  <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2">
                    <Plus className="w-4 h-4" />
                    Nuevo Empleado
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 h-12 rounded-xl"
          />
        </div>

        {/* Tabla */}
        <Card className="bg-white border-gray-200 overflow-hidden">
          <CardContent className="p-0">
            {filteredEmployees.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400">No hay empleados registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Nombre</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Cédula</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Teléfono</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Rol</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Estado</th>
                      {isAdmin && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <AnimatePresence>
                      {filteredEmployees.map((employee: any) => (
                        <motion.tr 
                          key={employee.id} 
                          className="hover:bg-gray-50 transition-colors group"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{employee.first_name}</p>
                              <p className="text-sm text-gray-400">{employee.last_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300">{employee.email}</td>
                          <td className="px-6 py-4 text-gray-300">{employee.cedula || '-'}</td>
                          <td className="px-6 py-4 text-gray-300">{employee.phone || '-'}</td>
                          <td className="px-6 py-4">
                            <Badge className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20">
                              {employee.roles?.role_name || 'Sin rol'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`border ${statusConfig[employee.status]?.color}`}>
                              {statusConfig[employee.status]?.badge || employee.status}
                            </Badge>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setEditingEmployee(employee)}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-400 hover:text-red-300"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de edición */}
        {editingEmployee && (
          <EditForm
            employee={editingEmployee}
            onClose={() => setEditingEmployee(null)}
            onSave={handleEditSave}
          />
        )}
      </main>
    </div>
  )
}
