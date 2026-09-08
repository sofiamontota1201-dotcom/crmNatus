"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RotateCcw, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdjustmentsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navigation />
      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-amber-100 border border-amber-200 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-amber-600 uppercase">Inventario</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-light text-gray-800 tracking-tight">
              Mermas y Ajustes
            </h1>
            <p className="text-gray-500 mt-2">Registro de perdidas con trazabilidad y aprobacion</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Ajuste
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-1">Ajustes Pendientes</p>
              <h3 className="text-3xl font-light text-amber-600">0</h3>
              <p className="text-xs text-gray-400 mt-2">Requieren aprobacion de rol superior</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-1">Aprobados este Mes</p>
              <h3 className="text-3xl font-light text-green-600">0</h3>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-800">Historial de Ajustes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 mb-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Motivos de ajuste</p>
              <div className="flex flex-wrap gap-2">
                {['Dano', 'Robo', 'Perdida', 'Descuadre', 'Otro'].map((reason) => (
                  <span key={reason} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-center py-8">
              <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No hay ajustes registrados</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
