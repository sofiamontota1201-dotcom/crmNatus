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

  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect("/login")

  const permissions = await getUserPermissions(sb, user.id)

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
    <div className="flex min-h-screen bg-background font-sans text-gray-900">
      <Navigation />

      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="mb-8">
          <Link href="/roles-permissions">
            <Button variant="ghost" className="gap-2 mb-4 text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>

          <h1 className="text-3xl font-light text-gray-900 tracking-tight">
            Crear Nuevo Empleado
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Agrega un nuevo empleado al sistema y asigna un rol con permisos
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-white border-gray-200">
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
        <Card className="bg-white border-gray-200 mt-6">
          <CardHeader>
            <CardTitle className="text-sm">¿Cómo funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
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
