"use client"

import { useState, useEffect, useMemo } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import type { Product, Vendor, MerchandiseLoad } from "@/types/domain"
import { Truck, Search, Plus, Trash2, CheckCircle, Package, DollarSign, ShoppingCart, Loader2, Clock, Eye, Filter, Check, ChevronsUpDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface CartItem {
    product: Product & { currentStock?: number }
    quantity: number
    unitCost: number
}

export default function CargarMercanciaPage() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [history, setHistory] = useState<MerchandiseLoad[]>([])
    const [vendorStocks, setVendorStocks] = useState<Record<number, number>>({})
    const [productPrices, setProductPrices] = useState<Record<number, number>>({})

    // Header form
    const [vendorId, setVendorId] = useState<string>("")
    const [referenceCode, setReferenceCode] = useState("")
    const [notes, setNotes] = useState("")

    // Product search
    const [searchTerm, setSearchTerm] = useState("")

    // Cart
    const [cart, setCart] = useState<CartItem[]>([])

    // History filter
    const [historyVendorFilter, setHistoryVendorFilter] = useState<string>("all")

    // Vendor combobox
    const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false)

    // Detail modal
    const [detailLoad, setDetailLoad] = useState<MerchandiseLoad | null>(null)
    const [showDetail, setShowDetail] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [productsRes, vendorsRes, historyRes] = await Promise.all([
                supabase.from('products').select('*').eq('status', 1).order('product_name'),
                supabase.from('vendors').select('*').order('name'),
                fetch('/api/merchandise-load').then(r => r.json()),
            ])

            if (productsRes.data) setProducts(productsRes.data as any)
            if (vendorsRes.data) setVendors(vendorsRes.data as any)
            if (Array.isArray(historyRes)) setHistory(historyRes)

            // Fetch stock quantities and buying prices per product
            if (productsRes.data) {
                const { data: stocks } = await supabase
                    .from('stocks')
                    .select('product_id, current_quantity, buying_price')
                    .eq('status', 1)

                if (stocks) {
                    const stockMap: Record<number, number> = {}
                    const priceMap: Record<number, number> = {}
                    for (const s of stocks as any[]) {
                        stockMap[s.product_id] = (stockMap[s.product_id] || 0) + s.current_quantity
                        if (s.buying_price && (!priceMap[s.product_id] || s.buying_price < priceMap[s.product_id])) {
                            priceMap[s.product_id] = s.buying_price
                        }
                    }
                    setVendorStocks(stockMap)
                    setProductPrices(priceMap)
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return []
        const term = searchTerm.toLowerCase()
        return products.filter(p =>
            p.productName?.toLowerCase().includes(term) ||
            p.sku?.toLowerCase().includes(term) ||
            p.barcode?.toLowerCase().includes(term)
        ).slice(0, 20).map(p => ({
            ...p,
            currentStock: vendorStocks[p.id] || 0,
        }))
    }, [products, searchTerm, vendorStocks])

    const addToCart = (product: Product & { currentStock?: number }) => {
        const existing = cart.find(c => c.product.id === product.id)
        if (existing) {
            setCart(cart.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c))
        } else {
            const defaultCost = productPrices[product.id] || 0
            setCart([...cart, { product, quantity: 1, unitCost: defaultCost }])
        }
        setSearchTerm("")
        toast({ title: "Agregado", description: `${product.productName} agregado al carrito` })
    }

    const updateCartItem = (productId: number, field: 'quantity' | 'unitCost', value: number) => {
        setCart(cart.map(c => c.product.id === productId ? { ...c, [field]: Math.max(0, value) } : c))
    }

    const removeFromCart = (productId: number) => {
        setCart(cart.filter(c => c.product.id !== productId))
    }

    const clearCart = () => setCart([])

    const cartTotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
    const cartItems = cart.reduce((sum, item) => sum + item.quantity, 0)

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast({ title: "Error", description: "Agrega al menos un producto al carrito", variant: "destructive" })
            return
        }

        const missingCost = cart.find(c => c.unitCost <= 0)
        if (missingCost) {
            toast({ title: "Error", description: `Ingresa el costo unitario de: ${missingCost.product.productName}`, variant: "destructive" })
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/merchandise-load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId: vendorId ? Number(vendorId) : null,
                    referenceCode: referenceCode || null,
                    notes: notes || null,
                    items: cart.map(c => ({
                        productId: c.product.id,
                        quantity: c.quantity,
                        unitCost: c.unitCost,
                    })),
                }),
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            toast({
                title: "¡Carga Exitosa!",
                description: `${cartItems} unidades de ${cart.length} productos cargadas al inventario`
            })

            setCart([])
            setVendorId("")
            setReferenceCode("")
            setNotes("")
            loadData()

        } catch (err: any) {
            toast({ title: "Error", description: err.message || "No se pudo cargar la mercancía", variant: "destructive" })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteLoad = async (loadId: number) => {
        if (!confirm("¿Eliminar esta carga? Se revertirá el stock asociado.")) return

        try {
            const res = await fetch(`/api/merchandise-load?id=${loadId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error("Error al eliminar")
            toast({ title: "Carga eliminada", description: "El stock ha sido revertido" })
            loadData()
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" })
        }
    }

    const filteredHistory = useMemo(() => {
        if (historyVendorFilter === "all") return history
        return history.filter(h => h.vendorId?.toString() === historyVendorFilter)
    }, [history, historyVendorFilter])

    const selectedVendorInfo = useMemo(() => {
        if (!vendorId || vendorId === "none") return null
        return vendors.find(v => v.id.toString() === vendorId)
    }, [vendorId, vendors])

    if (loading) {
        return (
            <div className="flex min-h-screen bg-background overflow-hidden">
                <Navigation />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-background overflow-hidden">
            <Navigation />
            <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto scrollbar-thin">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 pt-16 md:pt-0">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <Truck className="w-7 h-7 text-primary" />
                            Carga de Mercancía
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Recibe y agrega productos al inventario</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                        {/* Header Form */}
                        <Card className="border-gray-200 bg-white shadow-sm">
                            <CardContent className="p-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-500 uppercase">Proveedor</Label>
                                        <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    role="combobox"
                                                    aria-expanded={vendorPopoverOpen}
                                                    className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 h-9 px-3 rounded-md text-sm text-left"
                                                >
                                                    {vendorId && vendorId !== "none"
                                                        ? vendors.find(v => v.id.toString() === vendorId)?.name
                                                        : "Seleccionar proveedor..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Buscar proveedor..." className="h-9" />
                                                    <CommandList>
                                                        <CommandEmpty>Sin resultados</CommandEmpty>
                                                        <CommandItem
                                                            value="none"
                                                            onSelect={() => { setVendorId("none"); setVendorPopoverOpen(false) }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", vendorId === "none" ? "opacity-100" : "opacity-0")} />
                                                            Sin proveedor
                                                        </CommandItem>
                                                        {vendors.map(v => (
                                                            <CommandItem
                                                                key={v.id}
                                                                value={v.name}
                                                                onSelect={() => { setVendorId(v.id.toString()); setVendorPopoverOpen(false) }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", vendorId === v.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex-1">
                                                                    <p>{v.name}</p>
                                                                    {v.nit && <p className="text-[10px] text-gray-400">NIT: {v.nit}</p>}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {selectedVendorInfo && (
                                            <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                                                {selectedVendorInfo.nit && <p>NIT: {selectedVendorInfo.nit}</p>}
                                                {selectedVendorInfo.contactPerson && <p>Contacto: {selectedVendorInfo.contactPerson}</p>}
                                                {selectedVendorInfo.paymentTerms && <p>Pago: {selectedVendorInfo.paymentTerms}</p>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-500 uppercase">Referencia Pedido</Label>
                                        <Input
                                            placeholder="Ej: PED-001"
                                            value={referenceCode}
                                            onChange={e => setReferenceCode(e.target.value)}
                                            className="bg-gray-50 border-gray-200 h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-500 uppercase">Notas</Label>
                                        <Input
                                            placeholder="Observaciones..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="bg-gray-50 border-gray-200 h-9 text-sm"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Product Search */}
                        <Card className="border-gray-200 bg-white shadow-sm">
                            <CardHeader className="bg-gray-50 border-b border-gray-200 py-3 px-5">
                                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <Search className="w-4 h-4 text-primary" />
                                    Buscar Producto
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5">
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Buscar por nombre, SKU o código de barras..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-gray-50 border-gray-200 text-sm"
                                    />
                                </div>

                                {filteredProducts.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                                        {filteredProducts.map(product => (
                                            <div
                                                key={product.id}
                                                onClick={() => addToCart(product)}
                                                className="text-left p-3 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                                            >
                                                <p className="text-sm font-black text-black truncate">{product.productName}</p>
<p className="text-[10px] text-gray-800 mt-0.5">
                                                     {product.sku || product.barcode || `ID: ${product.id}`}
                                                 </p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                        product.currentStock > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                                    )}>
                                                        Stock: {product.currentStock || 0}
                                                    </span>
                                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary hover:text-primary font-bold">
                                                        <Plus className="w-3 h-3 mr-1" /> Agregar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {searchTerm && filteredProducts.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-4">No se encontraron productos</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Cart Table */}
                        <Card className="border-gray-200 bg-white shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b border-gray-200 py-3 px-5">
                                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-primary" />
                                    Productos en la Carga
                                    {cart.length > 0 && (
                                        <Badge variant="secondary" className="text-[10px] h-5">{cart.length}</Badge>
                                    )}
                                </CardTitle>
                                {cart.length > 0 && (
                                    <Button size="sm" variant="ghost" onClick={clearCart} className="text-red-500 hover:text-red-600 text-xs h-7">
                                        <Trash2 className="w-3 h-3 mr-1" /> Vaciar
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                {cart.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400">
                                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Busca y agrega productos arriba</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                                    <th className="p-4 text-left">Producto</th>
                                                    <th className="p-4 text-center w-24">Cantidad</th>
                                                    <th className="p-4 text-center w-32">Costo Unit.</th>
                                                    <th className="p-4 text-right w-32">Total</th>
                                                    <th className="p-4 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {cart.map(item => (
                                                    <tr key={item.product.id} className="hover:bg-gray-50">
                                                        <td className="p-4">
<p className="font-bold text-gray-800 text-xs">{item.product.productName}</p>
                                                             <p className="text-[10px] text-gray-800">{item.product.sku || item.product.barcode || ""}</p>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={e => updateCartItem(item.product.id, 'quantity', Number(e.target.value))}
                                                                className="w-20 h-8 text-center text-xs mx-auto bg-gray-50 border-gray-200"
                                                            />
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={item.unitCost || ""}
                                                                onChange={e => updateCartItem(item.product.id, 'unitCost', Number(e.target.value))}
                                                                placeholder="$0"
                                                                className="w-28 h-8 text-center text-xs mx-auto bg-gray-50 border-gray-200"
                                                            />
                                                        </td>
                                                        <td className="p-4 text-right font-black text-xs text-gray-800">
                                                            ${(item.quantity * item.unitCost).toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <button
                                                                onClick={() => removeFromCart(item.product.id)}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {cart.length > 0 && (
                                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="flex gap-6 text-sm">
                                            <span className="text-gray-500">
                                                <span className="font-black text-gray-800">{cart.length}</span> productos
                                            </span>
                                            <span className="text-gray-500">
                                                <span className="font-black text-gray-800">{cartItems}</span> unidades
                                            </span>
                                            <span className="text-gray-500">
                                                Total: <span className="font-black text-green-600">${cartTotal.toLocaleString()}</span>
                                            </span>
                                        </div>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
                                        >
                                            {submitting ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                                            ) : (
                                                <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar Carga</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: History */}
                    <div className="space-y-6">
                        <Card className="border-gray-200 bg-white shadow-sm">
                            <CardHeader className="bg-gray-50 border-b border-gray-200 py-3 px-5">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        Historial de Cargas
                                    </CardTitle>
                                </div>
                                <div className="pt-2">
                                    <Select value={historyVendorFilter} onValueChange={setHistoryVendorFilter}>
                                        <SelectTrigger className="h-8 text-xs bg-white border-gray-200">
                                            <Filter className="w-3 h-3 mr-1 text-gray-400" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-gray-200">
                                            <SelectItem value="all">Todos los proveedores</SelectItem>
                                            {vendors.map(v => (
                                                <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                                {filteredHistory.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        Sin cargas registradas
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {filteredHistory.map(load => (
                                            <div key={load.id} className="p-4 hover:bg-gray-50">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-black text-gray-800">
                                                        #{String(load.id).padStart(3, '0')}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <Badge
                                                            variant={load.status === 'completed' ? 'default' : load.status === 'cancelled' ? 'destructive' : 'secondary'}
                                                            className="text-[9px] h-4"
                                                        >
                                                            {load.status === 'completed' ? 'Completada' : load.status === 'cancelled' ? 'Anulada' : load.status}
                                                        </Badge>
                                                        <button
                                                            onClick={() => { setDetailLoad(load); setShowDetail(true) }}
                                                            className="text-gray-400 hover:text-primary p-0.5"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLoad(load.id)}
                                                            className="text-gray-400 hover:text-red-500 p-0.5"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-gray-500">
                                                    {new Date(load.createdAt).toLocaleDateString('es-CO', {
                                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                                {load.vendors?.name && (
                                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                                        {load.vendors.name}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[10px] text-gray-400">
                                                        <Package className="w-3 h-3 inline mr-0.5" />
                                                        {load.totalItems} uds
                                                    </span>
                                                    <span className="text-[10px] font-bold text-green-600">
                                                        <DollarSign className="w-3 h-3 inline" />
                                                        {load.totalCost?.toLocaleString()}
                                                    </span>
                                                </div>
                                                {load.items && load.items.length > 0 && (
                                                    <div className="mt-2 space-y-0.5">
                                                        {load.items.slice(0, 3).map((item: any) => (
<p key={item.id} className="text-[9px] text-gray-800">
                                                                 {item.products?.product_name || `Prod #${item.productId}`} × {item.quantity}
                                                             </p>
                                                        ))}
                                                        {load.items.length > 3 && (
                                                            <p className="text-[9px] text-gray-300">+{load.items.length - 3} más...</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Detail Modal */}
                <Dialog open={showDetail} onOpenChange={setShowDetail}>
                    <DialogContent className="max-w-2xl bg-white max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" />
                                Detalle de Carga #{detailLoad ? String(detailLoad.id).padStart(3, '0') : ''}
                            </DialogTitle>
                        </DialogHeader>
                        {detailLoad && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Proveedor</p>
                                        <p className="font-semibold">{detailLoad.vendors?.name || 'Sin proveedor'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Estado</p>
                                        <Badge variant={detailLoad.status === 'completed' ? 'default' : 'destructive'}>
                                            {detailLoad.status === 'completed' ? 'Completada' : detailLoad.status}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Referencia</p>
                                        <p>{detailLoad.referenceCode || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Fecha</p>
                                        <p>{new Date(detailLoad.createdAt).toLocaleString('es-CO')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Total Items</p>
                                        <p className="font-bold">{detailLoad.totalItems} unidades</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Costo Total</p>
                                        <p className="font-bold text-green-600">${detailLoad.totalCost?.toLocaleString()}</p>
                                    </div>
                                </div>
                                {detailLoad.notes && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Notas</p>
                                        <p className="text-sm">{detailLoad.notes}</p>
                                    </div>
                                )}
                                {detailLoad.items && detailLoad.items.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold mb-2">Productos</p>
                                        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                                            <thead>
                                                <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-500">
                                                    <th className="p-3 text-left">Producto</th>
                                                    <th className="p-3 text-center">Cantidad</th>
                                                    <th className="p-3 text-right">Costo Unit.</th>
                                                    <th className="p-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {detailLoad.items.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="p-3">
<p className="font-bold text-xs">{item.products?.product_name || `Prod #${item.productId}`}</p>
                                                             <p className="text-[10px] text-gray-800">{item.products?.sku || item.products?.barcode || ''}</p>
                                                        </td>
                                                        <td className="p-3 text-center text-xs">{item.quantity}</td>
                                                        <td className="p-3 text-right text-xs">${item.unitCost?.toLocaleString()}</td>
                                                        <td className="p-3 text-right font-bold text-xs">${item.totalCost?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
