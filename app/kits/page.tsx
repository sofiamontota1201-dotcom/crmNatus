"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Boxes, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function KitsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navigation />
      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Boxes className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Productos & Listas</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-light text-gray-800 tracking-tight">
              Kits & Combos
            </h1>
            <p className="text-gray-500 mt-2">Agrupa productos en kits con stock individual descontado</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Kit
          </Button>
        </header>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Boxes className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Kits y Combos</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Crea kits estacionales como "Lista Escolar Basica" que al venderse descuentan cada componente del inventario individual.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Package className="w-4 h-4" />
              <span>Los kits descontaran stock de cada producto incluido</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
