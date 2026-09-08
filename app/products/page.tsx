import type { Metadata } from 'next'
import { createSupabaseServer } from '@/lib/supabase-server'
import { ProductsRepository } from '@/lib/repositories/productsRepository'
import { CategoriesRepository } from '@/lib/repositories/categoriesRepository'
import { VendorsRepository } from '@/lib/repositories/vendorsRepository'
import { ProductsClient } from './products-client'

export const metadata: Metadata = {
  title: 'Productos | Sistema de Gestión',
  description: 'Gestiona tu catálogo de productos',
}

export default async function ProductsPage() {
  const supabase = await createSupabaseServer()

  const productsRepo = new ProductsRepository(supabase)
  const categoriesRepo = new CategoriesRepository(supabase)
  const vendorsRepo = new VendorsRepository(supabase)

  const [products, categories, vendors] = await Promise.all([
    productsRepo.list(),
    categoriesRepo.listActive(),
    vendorsRepo.list()
  ])

  return (
    <ProductsClient
      initialProducts={products}
      categories={categories}
      vendors={vendors}
    />
  )
}
