import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { Stock } from '@/types/domain'
import { getUserPermissions, filterDataByPermissions, canPerformAction } from '@/lib/permissions'

export class StocksRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  async getById(id: number): Promise<Stock> {
    const { data, error } = await this.client
      .from('stocks')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return toCamelCaseKeys<Stock>(data)
  }

  async listWithRelations(): Promise<Stock[]> {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Obtener permisos del usuario
    const permissions = await getUserPermissions(this.client, user.id)

    const { data, error } = await this.client
      .from('stocks')
      .select(`
        *,
        products:products(product_name, details, status),
        vendors:vendors(name, phone),
        categories:categories(name)
      `)
      .order('id', { ascending: false })
    if (error) throw error

    const stocks = (data ?? []).map((row) => toCamelCaseKeys<Stock>(row))

    // Filtrar según permisos
    return filterDataByPermissions(stocks, user.id, permissions)
  }

  async create(input: Omit<Stock, 'id' | 'createdAt' | 'updatedAt' | 'products' | 'vendors' | 'categories'>): Promise<Stock> {
    const payload = toSnakeCaseKeys(input)

    // Use the server-side API route to bypass RLS restrictions on the anon key
    const res = await fetch('/api/stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      console.error('Stock create API error:', err)
      throw new Error(err.error || `Error al crear stock: ${res.status}`)
    }

    const data = await res.json()
    return toCamelCaseKeys<Stock>(data)
  }


  async update(id: number, input: Partial<Omit<Stock, 'id' | 'createdAt' | 'updatedAt' | 'products' | 'vendors' | 'categories'>>): Promise<Stock> {
    const payload = toSnakeCaseKeys(input)

    // Use the server-side API route to bypass RLS restrictions on the anon key
    const res = await fetch(`/api/stocks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      console.error("Stock update API error:", err)
      throw new Error(err.error || `Error al actualizar stock: ${res.status}`)
    }

    const data = await res.json()
    return toCamelCaseKeys<Stock>(data)
  }

  async remove(id: number): Promise<void> {
    const res = await fetch(`/api/stocks/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `Error al eliminar stock: ${res.status}`)
    }
  }

  async batchUpdateQuantities(updates: { id: number; currentQuantity: number }[]): Promise<void> {
    const res = await fetch('/api/stocks/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `Error en batch update: ${res.status}`)
    }
  }

}

