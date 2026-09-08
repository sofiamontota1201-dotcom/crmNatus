import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { Category } from '@/types/domain'

export class CategoriesRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  async list(): Promise<Category[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => toCamelCaseKeys<Category>(row))
  }

  async create(input: Pick<Category, 'name' | 'status'>): Promise<Category> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('categories')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return toCamelCaseKeys<Category>(data)
  }

  async listActive(): Promise<Category[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('status', 1)
      .order('name')
    if (error) throw error
    return (data ?? []).map((row) => toCamelCaseKeys<Category>(row))
  }

  async update(id: number, input: Partial<Pick<Category, 'name' | 'status'>>): Promise<Category> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return toCamelCaseKeys<Category>(data)
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.client.from('categories').delete().eq('id', id)
    if (error) throw error
  }
}
