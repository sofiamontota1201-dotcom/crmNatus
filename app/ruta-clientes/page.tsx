'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, MapPin, Search, Plus, ExternalLink, Route, XCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Customer, Prospect } from '@/types/domain'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { ProspectsRepository } from '@/lib/repositories/prospectsRepository'
import { toast } from 'sonner'

// Dynamic import for Map to avoid SSR issues
const ClientMap = dynamic(() => import('@/components/map/client-map'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">Cargando Mapa...</div>
})

const INITIAL_PROSPECTS: Prospect[] = []

export default function RutaClientesPage() {
  const [prospects, setProspects] = useState<Prospect[]>(INITIAL_PROSPECTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(false)

  const repo = new ProspectsRepository(supabase)

  useEffect(() => {
    loadProspects()
  }, [])

  const loadProspects = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/prospects')
      if (!response.ok) throw new Error('Failed to fetch prospects')
      const data = await response.json()
      setProspects(data)
    } catch (error) {
      console.error('Error loading prospects:', error)
      toast.error('No se pudieron cargar los prospectos')
    } finally {
      setLoading(false)
    }
  }

  const filteredProspects = prospects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCity = selectedCity === 'all' || p.city?.includes(selectedCity)
    return matchesSearch && matchesCity
  })

  const cities = Array.from(new Set(prospects.map(p => p.city?.split(',')[0]))).filter(Boolean)

  const handleConvertToCustomer = async (prospect: Prospect) => {
    setLoading(true)
    try {
      await repo.convertToCustomer(prospect.id)
      toast.success(`${prospect.name} convertido a cliente exitosamente`)
      loadProspects() // Refresh list
    } catch (error) {
      toast.error('Error al convertir prospecto')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDiscardProspect = async (prospect: Prospect) => {
    if (!confirm(`¿Estás seguro de descartar a ${prospect.name}?`)) return

    setLoading(true)
    try {
      await repo.remove(prospect.id)
      toast.info(`${prospect.name} ha sido eliminado`)
      setProspects(prev => prev.filter(p => p.id !== prospect.id))
    } catch (error) {
      toast.error('Error al descartar prospecto')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const [campaignMessage, setCampaignMessage] = useState(
    "¡Hola al equipo de [Nombre]! 👋\n\nLos saludamos de GGL Logística, distribuidores de Darrow 🏍️.\n\nLes escribo porque sabemos que lo que más quita tiempo en un taller es un empaque que no calza bien o un retenedor que se sopla a los 15 días.\n\nNuestra empaquetadura viene con medidas exactas y materiales reforzados para que el motor salga sellado a la primera y no tengan que perder tiempo (ni plata) en garantías. 🛠️✅\n\nConozcan la línea técnica aquí: https://web-ggl.vercel.app/ 🌐\n\n¿Les puedo compartir la lista de precios mayorista? Tenemos excelentes márgenes para que el repuesto también les deje buena utilidad. 🤝"
  )
  const [sendingCampaign, setSendingCampaign] = useState(false)

  const handleLaunchCampaign = async () => {
    if (selectedCity === 'all') {
      toast.error('Por favor selecciona una ciudad para lanzar la campaña')
      return
    }

    const targets = filteredProspects.filter(p => p.phone)
    if (targets.length === 0) {
      toast.error('No hay prospectos con teléfono en esta zona')
      return
    }

    if (!confirm(`¿Estás seguro de lanzar la campaña a ${targets.length} prospectos en ${selectedCity}?`)) return

    setSendingCampaign(true)
    try {
      const response = await fetch('/api/prospects/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospects: targets,
          message: campaignMessage
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(`Campaña enviada: ${result.sentCount} mensajes entregados`)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error('Error al lanzar campaña: ' + error.message)
    } finally {
      setSendingCampaign(false)
    }
  }

  // Map expects Customer[] for compatibility with existing UI, but Prospect works if we cast
  const mapData = filteredProspects.map(p => ({
    ...p,
    customerName: p.name
  })) as any as Customer[]

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-700">
      <Navigation />

      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-6 overflow-x-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Ruta de Clientes</h2>
            <p className="text-xs md:text-sm text-gray-500">
              Gestión de prospección y campañas para GGL Logística.
            </p>
          </div>
        </div>

        <Tabs defaultValue="map" className="space-y-4">
          <TabsList className="bg-gray-100 border border-gray-200 p-1 rounded-xl">
            <TabsTrigger
              value="map"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white text-gray-500"
            >
              <Route size={16} /> Mapa de Ruta
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white text-gray-500"
            >
              <Search size={16} /> Lista de Prospectos
            </TabsTrigger>
            <TabsTrigger
              value="campaign"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white text-gray-500"
            >
              <Phone size={16} /> Gestión de Campañas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4 pt-2">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-1 order-2 md:order-1 space-y-4">
                <div className="bg-white border-gray-200 p-4 md:p-5 rounded-2xl space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm mb-4 border-b border-gray-100 pb-2">Filtros de Ruta</h3>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Ciudad / Zona</label>
                      <select
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                      >
                        <option value="all">Todas las zonas</option>
                        {cities.map(city => (
                          <option key={city} value={city!}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-3">Resumen de Ruta</div>
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-gray-600 text-xs">Total Puntos:</span>
                      <span className="text-xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]">
                        {filteredProspects.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                  {filteredProspects.map(p => (
                    <div key={p.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm hover:bg-primary/20 hover:border-primary/30 cursor-pointer transition-all duration-300 group">
                      <div className="font-bold text-gray-700 group-hover:text-white transition-colors">{p.name}</div>
                      <div className="text-[10px] text-gray-500 group-hover:text-gray-500">{p.city}</div>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={`https://wa.me/57${p.phone?.replace(/\s/g, '')}`}
                          className="text-green-500 hover:text-green-400 flex items-center gap-1 text-[10px] font-bold"
                          target="_blank"
                        >
                          <Phone size={10} /> WhatsApp
                        </a>
                        <button
                          onClick={() => handleDiscardProspect(p)}
                          className="text-red-500/70 hover:text-red-400 flex items-center gap-1 text-[10px] font-bold ml-auto"
                        >
                          <XCircle size={10} /> Descartar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 order-1 md:order-2 h-[400px] md:h-auto min-h-[400px]">
                <ClientMap customers={mapData} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="bg-white border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar prospecto o ciudad..."
                    className="pl-10 bg-gray-50 border-gray-200 text-gray-700 focus:ring-primary/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button size="sm" className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/20 border-0">
                  <Plus className="mr-2 h-4 w-4" /> Agregar Prospecto
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 font-semibold text-gray-600">Negocio</th>
                      <th className="px-6 py-4 font-semibold text-gray-600">Ubicación</th>
                      <th className="px-6 py-4 font-semibold text-gray-600">Dirección</th>
                      <th className="px-6 py-4 font-semibold text-gray-600">Estado</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProspects.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-all duration-200">
                        <td className="px-6 py-5">
                          <div className="font-bold text-gray-800 text-base">{p.name}</div>
                          {p.phone && <div className="text-xs text-gray-500 font-mono mt-0.5">{p.phone}</div>}
                        </td>
                        <td className="px-6 py-5 text-gray-600">{p.city}</td>
                        <td className="px-6 py-5 text-gray-500 text-xs italic">{p.address}</td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border",
                            p.status === 'converted'
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-primary/10 text-primary border-primary/20"
                          )}>
                            {p.status === 'converted' ? 'Convertido' : 'Prospecto'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white"
                              onClick={() => handleConvertToCustomer(p)}
                              disabled={loading || p.status === 'converted'}
                            >
                              Convertir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white"
                              onClick={() => handleDiscardProspect(p)}
                              disabled={loading}
                            >
                              Descartar
                            </Button>
                          </div>
                        </td>
                      </tr>
                  ))}
                        </tbody>
                      </table>
            </div>
              </div>
          </TabsContent>

          <TabsContent value="campaign" className="space-y-4 pt-2">
            {selectedCity === 'all' ? (
              <div className="grid gap-4 md:grid-cols-3">
                {cities.map(city => {
                  const count = prospects.filter(p => p.city?.includes(city!)).length
                  return (
                    <div key={city} 
                      onClick={() => setSelectedCity(city!)}
                      className="bg-white border-gray-200 p-6 rounded-2xl hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                          <MapPin size={24} className="text-primary" />
                        </div>
                        <span className="bg-gray-50 px-3 py-1 rounded-full text-[10px] font-bold text-gray-500">
                          {count} Puntos
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">{city}</h4>
                      <p className="text-xs text-gray-500 mt-1">Sector disponible para campaña GGL</p>
                      <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-white border-primary/20 text-xs font-bold">
                        Gestionar Campaña
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white border-gray-200 p-6 rounded-2xl space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedCity('all')}
                          className="hover:bg-gray-100 text-gray-500"
                        >
                          ← Volver a Zonas
                        </Button>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                            Campaña: Sector {selectedCity}
                          </h3>
                        </div>
                      </div>
                      <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-bold border border-primary/20">
                        GGL Authorized
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest font-black text-gray-500">Mensaje para {selectedCity}</label>
                      <textarea 
                        value={campaignMessage}
                        onChange={(e) => setCampaignMessage(e.target.value)}
                        className="w-full h-64 bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm text-gray-700 focus:ring-2 focus:ring-primary/30 outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button 
                        onClick={handleLaunchCampaign}
                        disabled={sendingCampaign || filteredProspects.length === 0}
                        className="px-10 bg-primary hover:bg-primary/90 text-white font-bold h-14 rounded-xl shadow-sm transition-all hover:scale-[1.02]"
                      >
                        {sendingCampaign ? 'Enviando...' : `Lanzar Campaña en ${selectedCity}`}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-1 space-y-6">
                  <div className="bg-white border-gray-200 p-6 rounded-2xl space-y-6">
                    <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2">Destinatarios ({filteredProspects.length})</h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                      {filteredProspects.map(p => (
                        <div key={p.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-700 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-500">{p.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
