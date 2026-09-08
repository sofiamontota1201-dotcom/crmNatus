'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Customer } from '@/types/domain'
import { Phone, MapPin, ExternalLink } from 'lucide-react'

// Fix for default marker icons in Leaflet + Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface ClientMapProps {
  customers: Customer[]
  center?: [number, number]
  zoom?: number
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  map.setView(center, zoom)
  return null
}

export default function ClientMap({ customers, center = [5.2017, -74.8944], zoom = 10 }: ClientMapProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">Cargando Mapa...</div>

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-slate-200 shadow-md">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {customers.map((customer) => {
          if (!customer.latitude || !customer.longitude) return null
          
          return (
            <Marker key={customer.id} position={[customer.latitude, customer.longitude]}>
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-slate-900">{customer.customerName}</h3>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {customer.city}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {customer.address}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {customer.phone && (
                      <a 
                        href={`https://wa.me/57${customer.phone.replace(/\s/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-green-500 text-white p-1 rounded flex items-center gap-1 text-[10px] no-underline"
                      >
                        <Phone size={10} /> WhatsApp
                      </a>
                    )}
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white p-1 rounded flex items-center gap-1 text-[10px] no-underline"
                    >
                      <ExternalLink size={10} /> Google Maps
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
        <ChangeView center={center} zoom={zoom} />
      </MapContainer>
    </div>
  )
}
