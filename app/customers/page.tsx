"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import type { Customer } from "@/types/domain"
import { CustomersRepository } from "@/lib/repositories/customersRepository"
import { Plus, Edit, Trash2, Phone, Mail, MapPin, User, Search, IdCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    customerName: "",
    cedula: "",
    email: "",
    phone: "",
    address: "",
    status: true,
  })

  const repository = new CustomersRepository(supabase)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const list = await repository.list()
      setCustomers(list)
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los clientes", variant: "destructive" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const customerData = {
      customerName: formData.customerName,
      cedula: formData.cedula || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      status: formData.status ? 1 : 0,
    }

    try {
      if (editingCustomer) {
        await repository.update(editingCustomer.id, customerData)
      } else {
        await repository.create(customerData as any)
      }
      toast({ title: "Éxito", description: `Cliente ${editingCustomer ? "actualizado" : "creado"} correctamente` })
      setIsDialogOpen(false)
      resetForm()
      fetchCustomers()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || 'No se pudo guardar', variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      try {
        await repository.remove(id)
        toast({ title: "Éxito", description: "Cliente eliminado correctamente" })
        fetchCustomers()
      } catch {
        toast({ title: "Error", description: "No se pudo eliminar el cliente", variant: "destructive" })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      customerName: "",
      cedula: "",
      email: "",
      phone: "",
      address: "",
      status: true,
    })
    setEditingCustomer(null)
  }

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      customerName: customer.customerName,
      cedula: customer.cedula || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      status: customer.status === 1,
    })
    setIsDialogOpen(true)
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.cedula && customer.cedula.includes(searchTerm)),
  )

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Navigation />
      <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto scrollbar-thin text-gray-800">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
            <p className="text-gray-500">Administra tu base de datos de compradores</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-primary hover:bg-primary/90 text-gray-800 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Completa la información para facturación y contacto.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4 text-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-gray-500">Nombre Completo *</Label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-gray-500">Cédula / NIT</Label>
                    <Input
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-500">Teléfono</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-500">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-gray-500">Dirección</Label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2">
                    <Switch
                      checked={formData.status}
                      onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                    />
                    <Label className="text-sm font-medium text-gray-600">¿Cliente Activo?</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-gray-500">Cancelar</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 px-8">
                    {editingCustomer ? "Actualizar" : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 h-12 rounded-xl"
          />
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredCustomers.map((customer) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card className="bg-white border-gray-200 hover:border-primary/50 transition-all group overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 leading-tight">{customer.customerName}</h3>
                          <Badge variant={customer.status === 1 ? "secondary" : "destructive"} className="text-[9px] h-4 mt-1">
                            {customer.status === 1 ? "CLIENTE ACTIVO" : "INACTIVO"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(customer)} className="h-8 w-8 text-gray-500 hover:text-gray-800">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)} className="h-8 w-8 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <IdCard className="w-4 h-4 text-primary/50" />
                        <span className="truncate">{customer.cedula || "Identificación no reg."}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Phone className="w-4 h-4 text-primary/50" />
                        <span>{customer.phone || "Sin contacto móvil"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Mail className="w-4 h-4 text-primary/50" />
                        <span className="truncate">{customer.email || "Sin correo electrónico"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 text-primary/50" />
                        <span className="truncate">{customer.address || "Dirección no disponible"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
