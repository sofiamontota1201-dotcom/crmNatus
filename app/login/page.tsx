"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Credenciales inválidas. Por favor, verifica tu correo y contraseña.')
      } else {
        router.replace('/')
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 hidden sm:block">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-secondary/5 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[80px]" />
      </div>

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 sm:hidden bg-gradient-to-br from-gray-50 to-white" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-white border-gray-200 shadow-xl overflow-hidden">
          <CardContent className="p-6 sm:p-12 flex flex-col items-center">

            {/* Header / Logo */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="h-16 w-16 mb-4 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-gray-800 tracking-tight mb-2">
                CRM<span className="text-primary"> Natus</span>
              </h1>
              <p className="text-gray-500 text-sm">Papelería - Sistema de Gestión</p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-600 text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="email"
                    placeholder="Correo Electrónico"
                    className="pl-10 h-12 bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-primary focus:ring-primary/20 transition-all rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="password"
                    placeholder="Contraseña"
                    className="pl-10 h-12 bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-primary focus:ring-primary/20 transition-all rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Iniciar Sesión <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center mt-6">
                <p className="text-xs text-gray-400">
                  CRM Natus © {new Date().getFullYear()}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
