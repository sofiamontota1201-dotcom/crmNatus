'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Shield, User } from 'lucide-react'

export function UserRoleBadge() {
  const [role, setRole] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const userRole = (user.user_metadata?.role || 2) as number
          setRole(userRole)
        }
      } catch (error) {
        console.error('Error getting user role:', error)
      } finally {
        setLoading(false)
      }
    }

    getRole()
  }, [])

  if (loading) return null

  if (role === 1) {
    return (
      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 flex items-center gap-1">
        <Shield className="w-3 h-3" />
        Admin (Nuevo)
      </Badge>
    )
  }

  return (
    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
      <User className="w-3 h-3" />
      Usuario (Completo)
    </Badge>
  )
}
