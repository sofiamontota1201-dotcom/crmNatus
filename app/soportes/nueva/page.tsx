"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { createBrowserClient } from '@supabase/ssr'
import { UploadCloud, X, ArrowLeft, Loader2, FileText } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

export default function NuevoSoportePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  
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

  // Basic Supabase client for browser (requires anon key)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const imageUrls: string[] = []

      // 1. Upload Images to Supabase Storage
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `${formData.type}/${fileName}`

          const { error: uploadError, data } = await supabase.storage
            .from('receipts')
            .upload(filePath, file)

          if (uploadError) {
            console.error("Storage Error:", uploadError)
            toast({
              title: "Error subiendo imagen",
              description: "Asegúrate de haber creado el bucket 'receipts' público en Supabase Storage.",
              variant: "destructive"
            })
            setLoading(false)
            return
          }

          if (data) {
            const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath)
            imageUrls.push(publicUrl)
          }
        }
      }

      // 2. Insert Record
      const { error: insertError } = await supabase
        .from('invoice_supports')
        .insert([{
          type: formData.type,
          entity_type: formData.entity_type,
          entity_name: formData.entity_name,
          category: formData.category,
          description: formData.description,
          quantity: parseFloat(formData.quantity) || 1,
          unit_price: parseFloat(formData.unit_price) || 0,
          payment_method: formData.payment_method,
          invoice_date: formData.invoice_date,
          image_urls: imageUrls
        }])

      if (insertError) throw insertError

      toast({
        title: "Soporte registrado",
        description: "La factura/soporte se guardó correctamente.",
      })
      
      // Esperar un poco para que Supabase Realtime sincronice
      await new Promise(resolve => setTimeout(resolve, 500))
      
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
      setLoading(false)
    }
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
              <h1 className="text-xl md:text-2xl font-light tracking-tight text-gray-800">Nuevo Soporte / Factura</h1>
              <p className="text-xs md:text-sm text-gray-500">Registra un nuevo movimiento con su comprobante</p>
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

                <hr className="border-gray-200" />

                {/* Subida de Imágenes */}
                <div className="space-y-4">
                  <Label className="text-gray-600">Soportes Visuales (Recibos / Facturas)</Label>
                  
                  <div className="border-2 border-dashed border-gray-100 rounded-xl p-6 md:p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/jpeg, image/png, image/webp, application/pdf" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleImageChange}
                    />
                    <UploadCloud className="h-8 md:h-10 w-8 md:w-10 text-gray-400 mx-auto mb-3 md:mb-4" />
                    <p className="text-gray-600 font-medium text-sm md:text-base">Haz clic o arrastra imágenes o PDFs aquí</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF hasta 50MB</p>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-4">
                      {images.map((file, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-100 bg-gray-50 aspect-square flex items-center justify-center">
                          {file.type === 'application/pdf' ? (
                            <div className="flex flex-col items-center gap-2 text-red-400">
                              <FileText className="h-10 w-10" />
                              <span className="text-[10px] uppercase font-bold text-gray-500 px-2 truncate w-full text-center">
                                {file.name}
                              </span>
                            </div>
                          ) : (
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Preview ${i}`} 
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button 
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-2 right-2 p-1.5 bg-gray-600 hover:bg-red-500/80 text-white rounded-md md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 md:pt-6">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-medium shadow-sm"
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...</>
                    ) : (
                      'Registrar Soporte'
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>
          </form>

        </div>
      </main>
    </div>
  )
}
