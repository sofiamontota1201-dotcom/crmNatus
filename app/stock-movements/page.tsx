"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Plus, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function StockMovementsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navigation />
      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Inventario</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-light text-gray-800 tracking-tight">
              Entradas y Salidas
            </h1>
            <p className="text-gray-500 mt-2">Registro de todos los movimientos de inventario</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Entradas', value: '0', color: 'text-green-600' },
            { label: 'Salidas', value: '0', color: 'text-red-500' },
            { label: 'Ajustes', value: '0', color: 'text-amber-600' },
            { label: 'Mermas', value: '0', color: 'text-gray-500' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-1">{stat.label}</p>
                <h3 className={`text-3xl font-light ${stat.color}`}>{stat.value}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-800">Historial de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <ArrowUpDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No hay movimientos registrados</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
