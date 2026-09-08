import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, DollarSign, ArrowUpRight, Activity, Box, Search, Layers, ChevronRight } from "lucide-react"
import { redirect } from "next/navigation"
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getUserPermissions } from "@/lib/permissions"

async function getDashboardData(s: SupabaseClient<any, any, any>) {
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const permissions = await getUserPermissions(s, user.id)
  const userFilter = undefined

  const [
    { count: totalProducts },
    { count: lowStockProducts },
    { data: stockData },
    { data: inventoryHealth },
    { data: topSales },
  ] = await Promise.all([
    s.from("products").select("*", { count: "exact", head: true }),
    userFilter 
      ? s.from("stocks").select("*", { count: "exact", head: true }).eq("user_id", userFilter).lt("current_quantity", 10)
      : s.from("stocks").select("*", { count: "exact", head: true }).lt("current_quantity", 10),
    userFilter
      ? s.from("stocks").select("selling_price, buying_price, current_quantity, created_at").eq("user_id", userFilter)
      : s.from("stocks").select("selling_price, buying_price, current_quantity, created_at"),
    userFilter
      ? s.from("stocks")
         .select(`
            id, 
            current_quantity, 
            selling_price,
            products (product_name, categories(name), vendors (name))
         `)
         .eq("user_id", userFilter)
         .order('current_quantity', { ascending: true })
         .limit(8)
      : s.from("stocks")
         .select(`
            id, 
            current_quantity, 
            selling_price,
            products (product_name, categories(name), vendors (name))
         `)
         .order('current_quantity', { ascending: true })
         .limit(8),
    userFilter
      ? s.from("sells")
         .select(`
            id, 
            total_amount, 
            created_at,
            customers(customer_name)
         `)
         .eq("user_id", userFilter)
         .order('total_amount', { ascending: false })
         .limit(4)
      : s.from("sells")
         .select(`
            id, 
            total_amount, 
            created_at,
            customers(customer_name)
         `)
         .order('total_amount', { ascending: false })
         .limit(4)
  ])

  const inventoryValue     = stockData?.reduce((sum, stock) => sum + (stock.selling_price  * stock.current_quantity), 0) || 0
  const inventoryValueCost = stockData?.reduce((sum, stock) => sum + ((stock as any).buying_price * stock.current_quantity), 0) || 0
  
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const newItemsCount = stockData?.filter(s => new Date(s.created_at || new Date()) > thirtyDaysAgo).length || 0

  return {
    totalProducts: totalProducts || 0,
    lowStockProducts: lowStockProducts || 0,
    inventoryValue,
    inventoryValueCost,
    newItemsCount,
    inventoryHealth: inventoryHealth || [],
    topSales: topSales || []
  }
}

function KpiCard({ title, value, icon: Icon, trend, trendLabel, colorClass, highlightClass }: any) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
      <div className={cn("absolute -inset-1 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl", highlightClass)}></div>
      
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">{title}</p>
          <div className={cn("p-2.5 rounded-xl bg-gray-50 border border-gray-100", colorClass)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        
        <div className="flex items-end gap-4">
          <h3 className="text-4xl font-light text-gray-800 tracking-tight">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1 mb-1">
              <span className={cn("text-xs font-semibold px-2 py-1 rounded-md bg-gray-50 border border-gray-100 flex items-center", colorClass)}>
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {trend}
              </span>
              {trendLabel && <span className="text-xs text-gray-400">{trendLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function Dashboard() {
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

  const {
    totalProducts,
    lowStockProducts,
    inventoryValue,
    inventoryValueCost,
    newItemsCount,
    inventoryHealth,
    topSales
  } = await getDashboardData(sb)

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans selection:bg-primary/20 text-gray-800">
      <Navigation />
      
      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-7xl mx-auto w-full relative">
        <div className="fixed top-0 left-1/4 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="fixed bottom-0 right-1/4 w-3/4 h-[400px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Box className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Papeleria Natus</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-light text-gray-800 tracking-tight">
              Vision General del Inventario
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
            <div className="flex relative w-3 h-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40"></span>
              <span className="relative inline-flex rounded-full w-3 h-3 bg-green-500 border border-white"></span>
            </div>
            <span className="text-xs font-medium text-gray-500 tracking-wider">SISTEMA ACTIVO</span>
          </div>
        </header>

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <KpiCard
            title="VALOR TOTAL DEL INVENTARIO"
            value={`$${inventoryValue.toLocaleString('es-CO')}`}
            icon={DollarSign}
            colorClass="text-primary"
            highlightClass="bg-primary"
            trend="4.2%"
            trendLabel="vs mes anterior"
          />
          <KpiCard
            title="ALERTAS DE STOCK"
            value={lowStockProducts}
            icon={AlertTriangle}
            colorClass="text-red-500"
            highlightClass="bg-red-500"
            trend={lowStockProducts > 5 ? "Critico" : "Estable"}
          />
          <KpiCard
            title="NUEVOS ARTICULOS"
            value={totalProducts}
            icon={Layers}
            colorClass="text-secondary"
            highlightClass="bg-secondary"
            trend={`+${newItemsCount}`}
            trendLabel="este mes"
          />
        </div>

        {/* Inventario desglosado: Costo / Venta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-bold tracking-[0.15em] text-gray-500 uppercase mb-1">Inventario a Precio de Costo</p>
              <p className="text-xs text-gray-400 mb-4">Capital invertido en mercancia</p>
              <h3 className="text-3xl font-light text-amber-600">
                ${inventoryValueCost.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h3>
              <p className="text-xs text-gray-400 mt-2">Lo que costo comprar el stock actual</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-bold tracking-[0.15em] text-gray-500 uppercase mb-1">Inventario a Precio de Venta</p>
              <p className="text-xs text-gray-400 mb-4">Valor de venta al publico</p>
              <h3 className="text-3xl font-light text-primary">
                ${inventoryValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h3>
              <p className="text-xs text-gray-400 mt-2">Potencial de ingresos si se vende todo el stock</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-bold tracking-[0.15em] text-gray-500 uppercase mb-1">Valor Total de Venta</p>
              <p className="text-xs text-gray-400 mb-4">Precio de venta al publico</p>
              <h3 className="text-3xl font-light text-rose-500">
                ${inventoryValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h3>
              <p className="text-xs text-gray-400 mt-2">Total que los clientes pagarian si se vende todo el stock</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Inventory Health Table */}
          <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-gray-100">
              <div>
                <CardTitle className="text-lg font-medium text-gray-800">Estado de Salud del Inventario</CardTitle>
                <CardDescription className="text-gray-500 mt-1">Estado en tiempo real de los niveles criticos de stock y proveedores.</CardDescription>
              </div>
              <div className="p-2 bg-gray-50 rounded-md border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-lg">Producto</th>
                      <th className="px-6 py-4">Nivel de Stock</th>
                      <th className="px-6 py-4">Valor Est.</th>
                      <th className="px-6 py-4 rounded-tr-lg">Proveedor Principal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventoryHealth.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <Box className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">{item.products?.product_name || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{item.products?.categories?.name || 'Sin Categoria'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full", item.current_quantity < 10 ? "bg-red-500" : item.current_quantity < 30 ? "bg-amber-500" : "bg-primary")}
                                style={{ width: `${Math.min(100, (item.current_quantity / 100) * 100)}%` }}
                              />
                            </div>
                            <span className={cn("font-mono font-medium", item.current_quantity < 10 ? "text-red-500" : "text-gray-600")}>
                              {item.current_quantity}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-600">${item.selling_price.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-500 font-normal">
                            {item.products?.vendors?.name || 'Directo'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {inventoryHealth.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                          No hay datos de inventario disponibles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mejores Ventas */}
          <div className="flex flex-col gap-6">
            <Card className="bg-white border-gray-200 shadow-sm flex-1">
              <CardHeader className="pb-4 border-b border-gray-100">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Mejores Ventas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-0">
                <div className="flex flex-col divide-y divide-gray-100">
                  {topSales.map((sale: any, index: number) => (
                    <div key={sale.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-500">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 text-sm">
                            {sale.customers?.customer_name || 'Cliente Casual'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-primary text-sm">
                        ${sale.total_amount.toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}
                  {topSales.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      No hay ventas registradas.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </main>
    </div>
  )
}
