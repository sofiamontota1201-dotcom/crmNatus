
"use client"

import { Navigation } from "@/components/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"
import { BarChart3, Package, ShoppingCart, Loader2 } from "lucide-react"

const ProfitabilityAnalysisReport = dynamic(
    () => import("@/components/reports/profitability-report").then(m => ({ default: m.ProfitabilityAnalysisReport })),
    { loading: () => <div className="flex items-center justify-center p-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> }
)
const InventoryReport = dynamic(
    () => import("@/components/reports/inventory-report").then(m => ({ default: m.InventoryReport })),
    { loading: () => <div className="flex items-center justify-center p-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> }
)
const SalesReport = dynamic(
    () => import("@/components/reports/sales-report").then(m => ({ default: m.SalesReport })),
    { loading: () => <div className="flex items-center justify-center p-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> }
)

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      <Navigation />
      <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2 pt-16 md:pt-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Reportes Inteligentes</h1>
            <p className="text-gray-500 text-sm mt-1">Toma decisiones basadas en datos reales</p>
          </div>
        </div>

        <Tabs defaultValue="profitability" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-50 border border-gray-200 p-1">
            <TabsTrigger value="profitability" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white text-gray-500 text-xs">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Rentabilidad</span>
              <span className="sm:hidden">Rent.</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white text-gray-500 text-xs">
              <Package className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Inventario</span>
              <span className="sm:hidden">Inv.</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white text-gray-500 text-xs">
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Ventas</span>
              <span className="sm:hidden">Ventas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profitability" className="space-y-4 animate-in fade-in-50 duration-500 slide-in-from-bottom-5">
            <ProfitabilityAnalysisReport />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 animate-in fade-in-50 duration-500 slide-in-from-bottom-5">
            <InventoryReport />
          </TabsContent>

          <TabsContent value="sales" className="space-y-4 animate-in fade-in-50 duration-500 slide-in-from-bottom-5">
            <SalesReport />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
