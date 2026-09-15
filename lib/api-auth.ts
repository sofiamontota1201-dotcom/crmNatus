import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServer } from './supabase-server'
import { getUserPermissions, hasPermission, type UserPermissions } from './permissions'

export type AuthSuccess = {
  ok: true
  user: { id: string; email?: string }
  permissions: UserPermissions
  supabase: SupabaseClient
}

export type AuthFailure = {
  ok: false
  response: NextResponse
}

export type AuthResult = AuthSuccess | AuthFailure

export function unauthorized(message = 'No autenticado') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'No autorizado') {
  return NextResponse.json({ error: message }, { status: 403 })
}

/**
 * Guard canónico para route handlers y server actions.
 * Verifica el JWT real con getUser() (no confía en la cookie sin validar),
 * exige empleado activo y, si se pasa `permiso`, comprueba el permiso granular.
 */
export async function requireUser(permiso?: string): Promise<AuthResult> {
  const supabase = await createSupabaseServer()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { ok: false, response: unauthorized() }
  }

  const permissions = await getUserPermissions(supabase, user.id)
  if (permissions.status !== 'active') {
    return { ok: false, response: forbidden('Empleado inactivo') }
  }

  if (permiso && !hasPermission(permissions, permiso)) {
    return { ok: false, response: forbidden() }
  }

  return { ok: true, user: { id: user.id, email: user.email }, permissions, supabase }
}

/**
 * Variante para server actions, donde no se puede devolver un NextResponse
 * (no es serializable): lanza un Error que el cliente puede capturar.
 */
export async function requireUserOrThrow(permiso?: string): Promise<AuthSuccess> {
  const result = await requireUser(permiso)
  if (!result.ok) {
    throw new Error(result.response.status === 403 ? 'No autorizado' : 'No autenticado')
  }
  return result
}
