"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import type { Vendor, MerchandiseLoad } from "@/types/domain"
import { VendorsRepository } from "@/lib/repositories/vendorsRepository"
import { Plus, Edit, Trash2, Phone, Mail, MapPin, Truck, DollarSign, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VendorStats {
  vendorId: number
  totalLoads: number
  totalSpent: number
  lastLoadDate: string | null
}

export default function VendorsPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorStats, setVendorStats] = useState<Record<number, VendorStats>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    nit: "",
    contactPerson: "",
    paymentTerms: "",
  })

  useEffect(() => {
    fetchVendors()
  }, [])

  const repository = new VendorsRepository(supabase)

  const fetchVendors = async () => {
    try {
      const list = await repository.list()
      setVendors(list)
      await fetchVendorStats()
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los proveedores", variant: "destructive" })
    }
  }

  const fetchVendorStats = async () => {
    try {
      const { data: loads } = await supabase
        .from('merchandise_loads')
        .select('vendor_id, total_cost, created_at')
        .not('vendor_id', 'is', null)

      if (!loads) return

      const stats: Record<number, VendorStats> = {}
      for (const load of loads) {
        const vid = load.vendor_id as number
        if (!stats[vid]) {
          stats[vid] = { vendorId: vid, totalLoads: 0, totalSpent: 0, lastLoadDate: null }
        }
        stats[vid].totalLoads++
        stats[vid].totalSpent += load.total_cost || 0
        if (!stats[vid].lastLoadDate || load.created_at > stats[vid].lastLoadDate) {
          stats[vid].lastLoadDate = load.created_at
        }
      }
      setVendorStats(stats)
    } catch (e) {
      console.error('Error fetching vendor stats:', e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingVendor) {
        await repository.update(editingVendor.id, formData)
      } else {
        await repository.create(formData as any)
      }
      toast({ title: "Éxito", description: `Proveedor ${editingVendor ? "actualizado" : "creado"} correctamente` })
      setIsDialogOpen(false)
      resetForm()
      fetchVendors()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || 'No se pudo guardar', variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este proveedor?")) {
      try {
        await repository.remove(id)
        toast({ title: "Éxito", description: "Proveedor eliminado correctamente" })
        fetchVendors()
      } catch {
        toast({ title: "Error", description: "No se pudo eliminar el proveedor", variant: "destructive" })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      nit: "",
      contactPerson: "",
      paymentTerms: "",
    })
    setEditingVendor(null)
  }

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email || "",
      address: vendor.address || "",
      nit: vendor.nit || "",
      contactPerson: vendor.contactPerson || "",
      paymentTerms: vendor.paymentTerms || "",
    })
    setIsDialogOpen(true)
  }

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone.includes(searchTerm) ||
      (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase())),
  )



  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 p-4 md:p-8 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pt-16 md:pt-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Proveedores</h1>
            <p className="text-muted-foreground">Gestiona la información de tus proveedores</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-popover border-border">
              <DialogHeader>
                <DialogTitle>{editingVendor ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
                <DialogDescription>
                  {editingVendor ? "Modifica los datos del proveedor" : "Completa la información del nuevo proveedor"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nit">NIT</Label>
                    <Input
                      id="nit"
                      value={formData.nit}
                      onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                      placeholder="900123456-7"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Persona de Contacto</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="paymentTerms">Términos de Pago</Label>
                    <Input
                      id="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="Ej: Contado, 30 días, 50% anticipado"
                      className="bg-background"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingVendor ? "Actualizar" : "Crear"} Proveedor</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <Input
            placeholder="Buscar proveedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:max-w-md bg-background"
          />
        </div>

        {/* Lista de proveedores */}
        <div className="grid gap-4">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{vendor.name}</h3>
                      {vendor.nit && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">NIT: {vendor.nit}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{vendor.phone}</span>
                      </div>
                      {vendor.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{vendor.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {vendor.contactPerson && (
                        <span>Contacto: <span className="text-gray-600 font-medium">{vendor.contactPerson}</span></span>
                      )}
                      {vendor.paymentTerms && (
                        <span>Pago: <span className="text-gray-600 font-medium">{vendor.paymentTerms}</span></span>
                      )}
                    </div>
                    {vendorStats[vendor.id] && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-gray-500">{vendorStats[vendor.id].totalLoads} cargas</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <DollarSign className="w-3.5 h-3.5 text-green-500" />
                          <span className="font-bold text-green-600">${vendorStats[vendor.id].totalSpent.toLocaleString()}</span>
                        </div>
                        {vendorStats[vendor.id].lastLoadDate && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-400">Última: {new Date(vendorStats[vendor.id].lastLoadDate!).toLocaleDateString('es-CO')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(vendor)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(vendor.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
