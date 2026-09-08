"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useParams } from "next/navigation"
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

export default function EditarSoportePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const supabaseId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    type: "gasto",
    entity_type: "interno",
    entity_name: "",
    category: "",
    description: "",
    quantity: "1",
    unit_price: "",
    payment_method: "efectivo",
    invoice_date: new Date().toISOString().split('T')[0]
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  useEffect(() => {
    const fetchFactura = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('invoice_supports')
          .select('*')
          .eq('id', supabaseId)
          .single()

        if (error) throw error

        if (data) {
          setFormData({
            type: data.type || "gasto",
            entity_type: data.entity_type || "interno",
            entity_name: data.entity_name || "",
            category: data.category || "",
            description: data.description || "",
            quantity: String(data.quantity || 1),
            unit_price: String(data.unit_price || 0),
            payment_method: data.payment_method || "efectivo",
            invoice_date: data.invoice_date || new Date().toISOString().split('T')[0]
          })
        }
      } catch (error: any) {
        console.error("Error fetching:", error)
        toast({
          title: "Error al cargar",
          description: error.message || "No se pudo cargar el soporte",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchFactura()
  }, [supabaseId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('invoice_supports')
        .update({
          type: formData.type,
          entity_type: formData.entity_type,
          entity_name: formData.entity_name,
          category: formData.category,
          description: formData.description,
          quantity: parseFloat(formData.quantity) || 1,
          unit_price: parseFloat(formData.unit_price) || 0,
          payment_method: formData.payment_method,
          invoice_date: formData.invoice_date,
        })
        .eq('id', supabaseId)

      if (error) throw error

      toast({
        title: "Soporte actualizado",
        description: "Los cambios se guardaron correctamente.",
      })
      
      router.push('/soportes')
      router.refresh()

    } catch (error: any) {
      console.error("Error saving:", error)
      toast({
        title: "Error al guardar",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 text-gray-800">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-500" />
            <p className="text-gray-500">Cargando soporte...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <Navigation />
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300">
        <div className="max-w-3xl mx-auto space-y-6">
          
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/soportes">
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-light tracking-tight text-gray-800">Editar Soporte / Factura</h1>
              <p className="text-xs md:text-sm text-gray-500">Modifica los detalles del comprobante</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4 md:p-6 space-y-6 md:space-y-8">
                
                {/* Tipo de Registro */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-600">Tipo de Movimiento</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                      <SelectTrigger className="bg-gray-50 border-gray-100 text-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-50 border-gray-100 text-gray-800">
                        <SelectItem value="gasto">Gasto Operativo</SelectItem>
                        <SelectItem value="compra">Compra a Proveedor</SelectItem>
                        <SelectItem value="venta">Venta a Cliente</SelectItem>
                        <SelectItem value="ingreso_caja">Ingreso Caja</SelectItem>
                        <SelectItem value="prestamo">Préstamo / Cuenta por Cobrar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Fecha del Soporte</Label>
                    <Input 
                      type="date" 
                      required
                      className="bg-gray-50 border-gray-100 text-gray-800" 
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                    />
                  </div>
                </div>

                {/* Detalles del Tercero */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-600">Tipo de Tercero</Label>
                    <Select value={formData.entity_type} onValueChange={(v) => setFormData({...formData, entity_type: v})}>
                      <SelectTrigger className="bg-gray-50 border-gray-100 text-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-50 border-gray-100 text-gray-800">
                        <SelectItem value="interno">Interno (Empresa/Empleado)</SelectItem>
                        <SelectItem value="proveedor">Proveedor</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Nombre del Tercero</Label>
                    <Input 
                      required
                      placeholder="Ej: Estación de Servicio, Ferretería XYZ..." 
                      className="bg-gray-50 border-gray-100 text-gray-800" 
                      value={formData.entity_name}
                      onChange={(e) => setFormData({...formData, entity_name: e.target.value})}
                    />
                  </div>
                </div>

                <hr className="border-gray-200" />

                {/* Detalles Financieros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-600">Categoría</Label>
                    <Input 
                      required
                      placeholder="Ej: Gasolina, Insumos, Papelería" 
                      className="bg-gray-50 border-gray-100 text-gray-800" 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Método de Pago</Label>
                    <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                      <SelectTrigger className="bg-gray-50 border-gray-100 text-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-50 border-gray-100 text-gray-800">
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta (Débito/Crédito)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-600">Descripción del Gasto/Compra</Label>
                  <Textarea 
                    required
                    placeholder="Describe los items facturados..." 
                    className="bg-gray-50 border-gray-100 text-gray-800 min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-600">Cantidad</Label>
                    <Input 
                      type="number" 
                      min="0.1" 
                      step="0.1" 
                      required
                      className="bg-gray-50 border-gray-100 text-gray-800" 
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Valor Unitario ($)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      required
                      placeholder="0"
                      className="bg-gray-50 border-gray-100 text-gray-800 text-lg font-medium" 
                      value={formData.unit_price}
                      onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-3 md:p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col md:flex-row justify-between items-center gap-2">
                  <span className="text-blue-200 text-sm md:text-base">Valor Total Calculado:</span>
                  <span className="text-xl md:text-2xl font-semibold text-blue-400">
                    $ {((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0)).toLocaleString('es-CO')}
                  </span>
                </div>

                <div className="pt-4 md:pt-6 space-y-3">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-medium shadow-sm"
                  >
                    {saving ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...</>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </Button>
                  <Link href="/soportes" className="w-full">
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full h-12 border-gray-100 text-gray-800 hover:bg-gray-100"
                    >
                      Cancelar
                    </Button>
                  </Link>
                </div>

              </CardContent>
            </Card>
          </form>

        </div>
      </main>
    </div>
  )
}
