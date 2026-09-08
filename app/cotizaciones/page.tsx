"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Phone, Package, Calendar, Clock, Search } from "lucide-react"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

interface Cotizacion {
  id: number
  total_amount: number
  sell_date: string
  created_at: string
  customers: {
    id: number
    customer_name: string
    phone: string
    address: string
  } | null
  details: {
    id: number
    sold_quantity: number
    sold_price: number
    stock: {
      product_code: string
      product: { product_name: string } | null
    } | null
  }[]
}

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [expandido, setExpandido] = useState<number | null>(null)

  useEffect(() => {
    cargarCotizaciones()
  }, [])

  const cargarCotizaciones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("sells")
      .select(`
        id,
        total_amount,
        sell_date,
        created_at,
        customers!inner(id, customer_name, phone, address),
        details:sell_details (
          id,
          sold_quantity,
          sold_price,
          stock:stocks (
            product_code,
            product:products (product_name)
          )
        )
      `)
      .eq("payment_status", 0)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setCotizaciones(data as unknown as Cotizacion[])
    }
    setLoading(false)
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor)
  }

  const filtradas = cotizaciones.filter((c) => {
    if (!busqueda) return true
    const termino = busqueda.toLowerCase()
    return (
      c.customers?.customer_name?.toLowerCase().includes(termino) ||
      c.customers?.phone?.includes(termino)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cotizaciones Recibidas</h1>
            <p className="text-gray-500 mt-1">
              Solicitudes de cotización desde la web
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-72"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Cargando cotizaciones...</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {busqueda
              ? "No se encontraron cotizaciones con ese criterio"
              : "No hay cotizaciones pendientes"}
          </div>
        ) : (
          <div className="space-y-4">
            {filtradas.map((cot) => (
              <div
                key={cot.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandido(expandido === cot.id ? null : cot.id)}
                  className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {cot.customers?.customer_name ?? "Cliente desconocido"}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pendiente
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        {cot.customers?.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            {cot.customers.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          {cot.details?.length ?? 0} producto(s)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {cot.sell_date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatearFecha(cot.created_at)}
                        </span>
                      </div>
                      {cot.customers?.address && (
                        <p className="text-sm text-gray-400 mt-1">
                          {cot.customers.address}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-emerald-600">
                        {formatearMoneda(cot.total_amount)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        #{cot.id}
                      </p>
                    </div>
                  </div>
                </button>

                {expandido === cot.id && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <div className="p-5">
                      <h4 className="font-medium text-sm text-gray-700 mb-3">
                        Productos solicitados:
                      </h4>
                      <div className="space-y-2">
                        {(cot.details ?? []).length === 0 ? (
                          <p className="text-sm text-gray-400">Sin productos</p>
                        ) : (
                          cot.details.map((det) => (
                            <div
                              key={det.id}
                              className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-100"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-800">
                                  {det.stock?.product?.product_name ?? det.stock?.product_code ?? "Producto"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800">
                                  x{det.sold_quantity}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {formatearMoneda(det.sold_price)}/und
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        {cot.customers?.phone && (
                          <a
                            href={`https://wa.me/57${cot.customers.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hola ${cot.customers.customer_name}, soy asesor de GGL. Recibí tu solicitud de cotización #${cot.id}. ¿Puedo ayudarte con los precios y disponibilidad?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                          >
                            <Phone className="w-4 h-4" />
                            Contactar por WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
