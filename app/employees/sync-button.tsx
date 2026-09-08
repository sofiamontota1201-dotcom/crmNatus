'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export function SyncButton() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employees/sync')
      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Error sincronizando usuarios',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Sincronización completada',
        description: `${data.synced} usuarios sincronizados exitosamente`,
      })

      // Recargar la página para ver los cambios
      window.location.reload()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error sincronizando usuarios',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="border-cyan-500/20 hover:bg-cyan-500/10 gap-2"
      onClick={handleSync}
      disabled={loading}
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Sincronizando...' : 'Sincronizar'}
    </Button>
  )
}
