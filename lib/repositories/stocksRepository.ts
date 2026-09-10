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

  async listWithRelations(options?: { search?: string; limit?: number }): Promise<Stock[]> {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Obtener permisos del usuario
    const permissions = await getUserPermissions(this.client, user.id)

    let query = this.client
      .from('stocks')
      .select(`
        *,
        products:products(product_name, details, status),
        vendors:vendors(name, phone),
        categories:categories(name)
      `)
      .order('id', { ascending: false })
    if (options?.search) {
      query = query.ilike('product_code', `%${options.search}%`)
    }
    query = query.limit(options?.limit ?? 500)
    const { data, error } = await query
    if (error) throw error

    const stocks = (data ?? []).map((row) => toCamelCaseKeys<Stock>(row))

    // Filtrar según permisos
    return filterDataByPermissions(stocks, user.id, permissions)
  }

  // Trae TODOS los productos activos - los que no tienen stock aparecen con currentQuantity 0
  async listForPOS(): Promise<Stock[]> {
    const [stocksResult, productsResult] = await Promise.all([
      this.client
        .from('stocks')
        .select(`
          id, product_code, current_quantity, buying_price, selling_price, status, category_id, product_id,
          products:products(product_name, id)
        `)
        .eq('status', 1)
        .order('id', { ascending: false }),
      this.client
        .from('products')
        .select('id, product_name, category_id, status')
        .eq('status', 1)
        .order('product_name')
    ])
    if (stocksResult.error) throw stocksResult.error
    if (productsResult.error) throw productsResult.error

    const stocksData = (stocksResult.data ?? []).map((row) => toCamelCaseKeys<Stock>(row))
    const productsData = productsResult.data ?? []

    // Track which products already have stock records (by product_id AND by product_name)
    const stockProductIds = new Set(stocksData.filter((s: any) => s.productId && s.productId > 0).map((s: any) => s.productId))
    const stockProductNames = new Set(stocksData.map((s: any) => String(s.products?.productName || '').trim().toUpperCase()))

    const productsWithoutStock = productsData
      .filter((p) => !stockProductIds.has(p.id) && !stockProductNames.has(String(p.product_name || '').trim().toUpperCase()))
      .map((p) => ({
        id: -(p.id),
        productCode: `SIN-STOCK`,
        currentQuantity: 0,
        buyingPrice: 0,
        sellingPrice: 0,
        status: 1,
        categoryId: p.category_id,
        productId: p.id,
        products: { productName: p.product_name },
        chalanNo: '',
        discount: 0,
        stockQuantity: 0,
      } as Stock))

    return [...stocksData, ...productsWithoutStock]
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

