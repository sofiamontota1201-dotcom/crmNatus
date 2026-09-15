import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const auth = await requireUser('employees_create')
    if (!auth.ok) return auth.response

    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const body = await request.json()
    const { email, first_name, last_name, employee_id } = body

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Crear cliente de administración con SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Usar admin API para crear usuario en Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: false,
      user_metadata: {
        full_name: `${first_name} ${last_name}`,
        first_name,
        last_name,
      },
    })

    if (authError) {
      // Si el usuario ya existe, simplemente linkear
      if (authError.code === 'user_already_exists') {
        console.log(`User ${email} already exists, updating employee with auth_id`)
        
        // Obtener el usuario existente
        const { data: { users: existingUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (!listError && existingUsers) {
          const existingUser = existingUsers.find(u => u.email === email)

          if (existingUser && employee_id) {
            // Actualizar el empleado con el auth_id
            await supabase
              .from('employees')
              .update({ auth_id: existingUser.id })
              .eq('id', employee_id)
          }
        }

        return Response.json({
          success: true,
          warning: 'El usuario ya existe en el sistema',
          data: { email },
        })
      }

      throw authError
    }

    // Actualizar el empleado con el auth_id
    if (employee_id && authUser?.user) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ auth_id: authUser.user.id })
        .eq('id', employee_id)

      if (updateError) {
        console.error('Error updating employee with auth_id:', updateError)
      }
    }

    // TODO: Enviar email de invitación con link para establecer contraseña
    // Por ahora, retornar el usuario creado

    return Response.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        email: authUser.user.email,
        id: authUser.user.id,
      },
    })
  } catch (error: any) {
    console.error('Error creating auth user:', error)
    return Response.json(
      { error: error.message || 'Error creating user' },
      { status: 500 }
    )
  }
}
