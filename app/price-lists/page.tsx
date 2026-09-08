"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Banknote, Plus, Search, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PriceListsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navigation />
      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Banknote className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Productos & Listas</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-light text-gray-800 tracking-tight">
              Listas de Precios
            </h1>
            <p className="text-gray-500 mt-2">Configura precios diferenciados por perfil de cliente</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Nueva Lista
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {['Detal', 'Frecuente', 'Empresa', 'Mayorista'].map((profile) => (
            <Card key={profile} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{profile}</h3>
                    <p className="text-xs text-gray-400">Perfil de cliente</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">0 productos configurados</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-800">Reglas de Descuento por Volumen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">Las reglas de descuento por volumen se aplican automaticamente al detectar cantidades minimas en el POS.</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Prioridad de precios</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Precio por perfil de cliente (si existe)</li>
                <li>Descuento por volumen (si aplica)</li>
                <li>Mejor precio disponible (se aplica el mayor beneficio)</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
