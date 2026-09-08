'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, X, User, Phone, IdCard } from 'lucide-react'

interface EditFormProps {
  employee: any
  onClose: () => void
  onSave: () => void
}

export function EditForm({ employee, onClose, onSave }: EditFormProps) {
  const [formData, setFormData] = useState({
    first_name: employee.first_name,
    last_name: employee.last_name,
    phone: employee.phone || '',
    cedula: employee.cedula || '',
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar')
      }

      toast({
        title: 'Éxito',
        description: 'Empleado actualizado correctamente',
      })

      onSave()
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="glass-panel border border-white/10 rounded-2xl p-8 max-w-md w-full bg-black/40">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Editar Empleado</h2>
            <p className="text-sm text-gray-400 mt-1">Actualiza la información del empleado</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-5 mb-8">
          {/* Nombre */}
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Nombre
            </Label>
            <Input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nombre"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-10 rounded-xl"
            />
          </div>

          {/* Apellido */}
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Apellido
            </Label>
            <Input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={loading}
              placeholder="Apellido"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-10 rounded-xl"
            />
          </div>

          {/* Cédula */}
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <IdCard className="w-4 h-4" />
              Cédula
            </Label>
            <Input
              type="text"
              name="cedula"
              value={formData.cedula}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ej: 1234567890"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-10 rounded-xl"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Teléfono
            </Label>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ej: +57 3001234567"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-10 rounded-xl"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-10 gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            className="border-white/10 hover:bg-white/5 text-gray-300 rounded-xl h-10"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
