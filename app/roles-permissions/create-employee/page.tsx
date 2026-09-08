import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { redirect } from "next/navigation"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPermissions, hasPermission } from "@/lib/permissions"
import Link from "next/link"
import { CreateEmployeeForm } from "./form"

async function getRoles() {
  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { session } } = await sb.auth.getSession()
  if (!session) redirect("/login")

  const permissions = await getUserPermissions(sb, session.user.id)

  // Verificar permiso de acceso
  if (!hasPermission(permissions, 'employees_create')) {
    redirect("/")
  }

  // Obtener roles
  const { data: roles, error } = await sb
    .from('roles')
    .select('*')
    .order('role_name', { ascending: true })

  if (error) throw error

  return { roles: roles || [] }
}

export default async function CreateEmployeePage() {
  const { roles } = await getRoles()

  return (
    <div className="flex min-h-screen bg-[#080a0e] font-sans selection:bg-cyan-500/30 text-slate-200">
      <Navigation />
      
      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-2xl mx-auto w-full">
        <div className="fixed top-0 left-1/4 w-full h-[500px] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

        {/* Header */}
        <div className="mb-8">
          <Link href="/roles-permissions">
            <Button variant="ghost" className="gap-2 mb-4 text-slate-400 hover:text-slate-200">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          
          <h1 className="text-3xl font-light text-slate-100 tracking-tight">
            Crear Nuevo Empleado
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Agrega un nuevo empleado al sistema y asigna un rol con permisos
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-[#13151a] border-white/5">
          <CardHeader>
            <CardTitle>Información del Empleado</CardTitle>
            <CardDescription>
              Completa todos los campos requeridos. El usuario podrá autenticarse con su email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateEmployeeForm roles={roles} />
          </CardContent>
        </Card>

        {/* Ayuda */}
        <Card className="bg-[#13151a] border-white/5 mt-6">
          <CardHeader>
            <CardTitle className="text-sm">¿Cómo funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-400">
            <p>
              1. <strong>Crea el empleado</strong> en este formulario con su nombre, email y teléfono.
            </p>
            <p>
              2. <strong>Asigna un rol</strong> que determine sus permisos y accesos.
            </p>
            <p>
              3. El empleado recibirá un <strong>email con instrucciones</strong> para crear su contraseña.
            </p>
            <p>
              4. Una vez autenticado, tendrá acceso a los módulos según su rol.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
