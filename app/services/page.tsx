"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, Plus, Printer, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navigation />
      <main className="flex-1 p-6 lg:p-10 transition-all duration-300 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Productos & Listas</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-light text-gray-800 tracking-tight">
              Servicios
            </h1>
            <p className="text-gray-500 mt-2">Gestiona servicios sin control de inventario tradicional</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Fotocopias', icon: Printer, price: '$500', cost: '$100' },
            { name: 'Impresiones', icon: Printer, price: '$1,000', cost: '$200' },
            { name: 'Plastificado', icon: Scissors, price: '$3,000', cost: '$500' },
          ].map((service) => (
            <Card key={service.name} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <service.icon className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{service.name}</h3>
                    <p className="text-xs text-gray-400">Servicio</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400">Precio</p>
                    <p className="text-lg font-semibold text-primary">{service.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Costo estimado</p>
                    <p className="text-sm text-gray-600">{service.cost}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
