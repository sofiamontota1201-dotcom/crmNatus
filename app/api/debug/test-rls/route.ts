import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    
    // 1. Intentar con anon key (tiene RLS)
    const supabaseAnon = createServerClient(
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

    const { data: anonEmployees, error: anonError } = await supabaseAnon
      .from('employees')
      .select('id, email')
      .limit(1)

    // 2. Intentar con service role key (NO tiene RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const { data: adminEmployees, error: adminError } = await supabaseAdmin
      .from('employees')
      .select('id, email')
      .limit(1)

    return Response.json({
      anon: {
        employees: anonEmployees,
        error: anonError?.message,
      },
      admin: {
        employees: adminEmployees,
        error: adminError?.message,
      },
      comparison: {
        anonWorks: !anonError && anonEmployees && anonEmployees.length > 0,
        adminWorks: !adminError && adminEmployees && adminEmployees.length > 0,
        message: anonEmployees?.length === 0 ? 'RLS is blocking anon access' : 'RLS is working'
      }
    })
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
