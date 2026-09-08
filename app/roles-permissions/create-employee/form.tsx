'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface Role {
  id: number
  role_name: string
  description: string
}

interface CreateEmployeeFormProps {
  roles: Role[]
}

export function CreateEmployeeForm({ roles }: CreateEmployeeFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_id: roles[0]?.id || '',
  })
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'role_id' ? parseInt(value) : value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.role_id) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // 1. Crear empleado en BD
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error creando empleado')
      }

      // 2. Crear usuario en Supabase Auth
      const authResponse = await fetch('/api/employees/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          employee_id: data.data.id,
        }),
      })

      const authData = await authResponse.json()

      if (!authResponse.ok) {
        // El empleado se creó pero hay problema con el usuario de auth
        console.error('Advertencia:', authData.warning)
      }

      setSuccess(true)
      toast({
        title: 'Empleado creado exitosamente',
        description: `${formData.first_name} ${formData.last_name} ha sido añadido al sistema`,
      })

      // Limpiar formulario
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role_id: roles[0]?.id || '',
      })

      // Redirigir después de 2 segundos
      setTimeout(() => {
        window.location.href = '/roles-permissions'
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'Error al crear empleado')
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Nombre <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Ej: Juan"
            className="w-full px-4 py-2 rounded-lg bg-[#0a0c10] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            disabled={loading}
          />
        </div>

        {/* Apellido */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Apellido <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Ej: Pérez"
            className="w-full px-4 py-2 rounded-lg bg-[#0a0c10] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            disabled={loading}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Ej: juan@empresa.com"
          className="w-full px-4 py-2 rounded-lg bg-[#0a0c10] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
          disabled={loading}
        />
        <p className="text-xs text-slate-500 mt-1">Este será el usuario para iniciar sesión</p>
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Teléfono
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Ej: +57 3001234567"
          className="w-full px-4 py-2 rounded-lg bg-[#0a0c10] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
          disabled={loading}
        />
      </div>

      {/* Rol */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Rol <span className="text-red-400">*</span>
        </label>
        <select
          name="role_id"
          value={formData.role_id}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg bg-[#0a0c10] border border-white/10 text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
          disabled={loading}
        >
          {roles.map(role => (
            <option key={role.id} value={role.id}>
              {role.role_name} ({role.description})
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">Determina los permisos y accesos del empleado</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400">¡Empleado creado exitosamente! Redirigiendo...</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creando...
            </>
          ) : (
            'Crear Empleado'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => window.history.back()}
          className="border-white/10 hover:bg-white/5"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
