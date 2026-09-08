'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface RoleChangeFormProps {
  employeeId: number
  employeeEmail: string
  currentRoleId: number
  roles: any[]
}

export function RoleChangeForm({
  employeeId,
  employeeEmail,
  currentRoleId,
  roles,
}: RoleChangeFormProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<number>(currentRoleId)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleChange = async () => {
    if (selectedRoleId === currentRoleId) {
      return
    }

    try {
      setLoading(true)

      const role = roles.find(r => r.id === selectedRoleId)
      
      const response = await fetch('/api/employees/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: employeeEmail,
          role_name: role.role_name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar rol')
      }

      toast({
        title: 'Éxito',
        description: `${employeeEmail} ahora es ${role.role_name}`,
      })

      // Recargar la página
      window.location.reload()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Si solo hay un rol, no mostrar el dropdown
  if (roles.length <= 1) {
    return <span className="text-gray-500">-</span>
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        value={selectedRoleId}
        onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
        disabled={loading}
        className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 hover:border-white/20 transition-colors"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.role_name}
          </option>
        ))}
      </select>

      {selectedRoleId !== currentRoleId && (
        <Button
          onClick={handleChange}
          disabled={loading}
          size="sm"
          className="bg-primary hover:bg-primary/90 h-9 text-xs gap-1 shadow-lg shadow-primary/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Guardando...
            </>
          ) : (
            'Cambiar'
          )}
        </Button>
      )}
    </div>
  )
}
