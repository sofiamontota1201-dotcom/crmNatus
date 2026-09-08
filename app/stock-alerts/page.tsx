"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Bell } from "lucide-react"

export default function StockAlertsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navigation />
      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-amber-100 border border-amber-200 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-amber-600 uppercase">Inventario</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-light text-gray-800 tracking-tight">
              Alertas de Stock
            </h1>
            <p className="text-gray-500 mt-2">Productos que requieren reposicion urgente</p>
          </div>
        </header>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Alertas Configurables</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Configura el stock minimo por producto para recibir alertas cuando sea necesario reponer.
              </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
