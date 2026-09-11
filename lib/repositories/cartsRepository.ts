import type { SupabaseClient } from '@supabase/supabase-js'

export interface PendingCart {
  id: string
  userId: string
  items: any[]
  customerId: number | null
  sellDate: string | null
  paymentMethod: number
  globalDiscount: string
  documentType: string
  createdAt: string
  updatedAt: string
}

export class CartsRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) { }

  async getOrCreate(): Promise<PendingCart | null> {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) return null

    const { data, error } = await this.client
      .from('pending_carts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error loading pending cart:', error)
      return null
    }

    return data as PendingCart | null
  }

  async save(cart: Omit<PendingCart, 'id' | 'createdAt' | 'updatedAt'>): Promise<PendingCart> {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Buscar si ya existe un carrito para este usuario
    const existing = await this.getOrCreate()

    if (existing) {
      const { data, error } = await this.client
        .from('pending_carts')
        .update({
          items: cart.items,
          customer_id: cart.customerId,
          sell_date: cart.sellDate,
          payment_method: cart.paymentMethod,
          global_discount: cart.globalDiscount,
          document_type: cart.documentType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error) throw error
      return data as PendingCart
    }

    const { data, error } = await this.client
      .from('pending_carts')
      .insert([{
        user_id: user.id,
        items: cart.items,
        customer_id: cart.customerId,
        sell_date: cart.sellDate,
        payment_method: cart.paymentMethod,
        global_discount: cart.globalDiscount,
        document_type: cart.documentType,
      }])
      .select('*')
      .single()

    if (error) throw error
    return data as PendingCart
  }

  async clear(): Promise<void> {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) return

    const { error } = await this.client
      .from('pending_carts')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error clearing pending cart:', error)
    }
  }
}
