"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
import { toCamelCaseKeys } from "@/lib/utils/case"
import type { Product, Vendor, MerchandiseLoad } from "@/types/domain"
import { ProductsRepository } from "@/lib/repositories/productsRepository"
import { Truck, Search, Plus, Trash2, CheckCircle, Package, DollarSign, ShoppingCart, Loader2, Clock, Eye, Filter, Check, ChevronsUpDown, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface CartItem {
    product: Product & { currentStock?: number }
    quantity: number
    unitCost: number
}

export default function CargarMercanciaPage() {
    const { toast } = useToast()
    const loadingRef = useRef(false)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [history, setHistory] = useState<MerchandiseLoad[]>([])
    const [vendorStocks, setVendorStocks] = useState<Record<number, number>>({})
    const [productPrices, setProductPrices] = useState<Record<number, number>>({})

    // Header form
    const [vendorId, setVendorId] = useState<string>("")
    const [referenceCode, setReferenceCode] = useState("")
    const [notes, setNotes] = useState("")

    // Product search & filter
    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")

    // Cart
    const [cart, setCart] = useState<CartItem[]>([])

    // History filter
    const [historyVendorFilter, setHistoryVendorFilter] = useState<string>("all")

    // Vendor combobox
    const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false)

    // Detail modal
    const [detailLoad, setDetailLoad] = useState<MerchandiseLoad | null>(null)
    const [showDetail, setShowDetail] = useState(false)

    // New Product Modal
    const [newProductOpen, setNewProductOpen] = useState(false)
    const [newProductForm, setNewProductForm] = useState({
        productName: "",
        sku: "",
        categoryId: "",
        unitOfMeasure: "unidad" as string,
    })
    const [creatingProduct, setCreatingProduct] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [productsRes, vendorsRes, categoriesRes, historyRes] = await Promise.all([
                supabase.from('products').select(`
                    id, product_name, sku, barcode, category_id, status,
                    stocks(product_id, current_quantity, buying_price)
                `).eq('status', 1).order('product_name'),
                supabase.from('vendors').select('id, name').order('name'),
                supabase.from('categories').select('id, name').eq('status', 1).order('name'),
                fetch('/api/merchandise-load').then(r => r.json()),
            ])

            if (productsRes.data) {
                const rawProducts = productsRes.data as any[]
                const stockMap: Record<number, number> = {}
                const priceMap: Record<number, number> = {}

                for (const p of rawProducts) {
                    if (p.stocks) {
                        for (const s of p.stocks) {
                            stockMap[s.product_id] = (stockMap[s.product_id] || 0) + s.current_quantity
                            if (s.buying_price && (!priceMap[s.product_id] || s.buying_price < priceMap[s.product_id])) {
                                priceMap[s.product_id] = s.buying_price
                            }
                        }
                    }
                }

                const cleanProducts = rawProducts.map(({ stocks, ...rest }: any) => toCamelCaseKeys(rest))
                setProducts(cleanProducts as any)
                setVendorStocks(stockMap)
                setProductPrices(priceMap)
            }

            if (vendorsRes.data) setVendors(vendorsRes.data.map((v: any) => toCamelCaseKeys(v)) as any)
            if (categoriesRes.data) setCategories(categoriesRes.data as any)
            if (Array.isArray(historyRes)) setHistory(historyRes.slice(0, 50))
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = useMemo(() => {
        let filtered = products.map(p => ({
            ...p,
            currentStock: vendorStocks[p.id] || 0,
        }))

        // Filter by category
        if (categoryFilter !== "all") {
            filtered = filtered.filter(p => p.categoryId?.toString() === categoryFilter)
        }

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(p =>
                p.productName?.toLowerCase().includes(term) ||
                p.sku?.toLowerCase().includes(term) ||
                p.barcode?.toLowerCase().includes(term)
            )
        }

        return filtered.slice(0, 50)
    }, [products, searchTerm, vendorStocks, categoryFilter])

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

    // --- CREATE NEW PRODUCT ---
    const handleCreateProduct = async () => {
        if (!newProductForm.productName.trim()) {
            toast({ title: "Error", description: "Ingresa el nombre del producto", variant: "destructive" })
            return
        }
        setCreatingProduct(true)
        try {
            const productsRepo = new ProductsRepository(supabase)
            const newProduct = await productsRepo.create({
                productName: newProductForm.productName.trim(),
                sku: newProductForm.sku.trim() || null as any,
                barcode: null as any,
                manufacturerCode: null as any,
                categoryId: newProductForm.categoryId ? Number(newProductForm.categoryId) : null,
                vendorId: vendorId && vendorId !== "none" ? Number(vendorId) : null,
                unitOfMeasure: newProductForm.unitOfMeasure as any,
                isSellableRetail: true,
                isSellableWholesale: false,
                isService: false,
                hasVariants: false,
                details: null,
                image: null,
                status: 1,
            } as any)

            toast({ title: "Producto Creado", description: `${newProduct.productName} agregado al catálogo` })
            setNewProductOpen(false)
            setNewProductForm({ productName: "", sku: "", categoryId: "", unitOfMeasure: "unidad" })
            loadData()
        } catch (err: any) {
            console.error(err)
            toast({ title: "Error", description: err.message || "No se pudo crear el producto", variant: "destructive" })
        } finally {
            setCreatingProduct(false)
        }
    }

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
                {/* Header compacto */}
                <div className="flex items-center justify-between mb-4 pt-16 md:pt-0">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <Truck className="w-7 h-7 text-primary" />
                            Carga de Mercancía
                        </h1>
                    </div>
                    <Button
                        onClick={() => setNewProductOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
                    </Button>
                </div>

                <div className="flex gap-4 h-[calc(100vh-140px)]">
                    {/* ─── COLUMNA IZQUIERDA: Productos (scrollable) ─── */}
                    <div className="flex-1 flex flex-col min-h-0 min-w-0">
                        {/* Header Form compacto */}
                        <Card className="border-gray-200 bg-white shadow-sm mb-3 shrink-0">
                            <CardContent className="p-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-semibold text-gray-500 uppercase">Proveedor</Label>
                                        <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    role="combobox"
                                                    aria-expanded={vendorPopoverOpen}
                                                    className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 h-8 px-3 rounded-md text-xs text-left"
                                                >
                                                    {vendorId && vendorId !== "none"
                                                        ? vendors.find(v => v.id.toString() === vendorId)?.name
                                                        : "Seleccionar proveedor..."}
                                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0 bg-white border-gray-200" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Buscar proveedor..." className="h-8" />
                                                    <CommandList>
                                                        <CommandEmpty>Sin resultados</CommandEmpty>
                                                        <CommandItem
                                                            value="none"
                                                            onSelect={() => { setVendorId("none"); setVendorPopoverOpen(false) }}
                                                            className="text-xs"
                                                        >
                                                            <Check className={cn("mr-2 h-3 w-3", vendorId === "none" ? "opacity-100" : "opacity-0")} />
                                                            Sin proveedor
                                                        </CommandItem>
                                                        {vendors.map(v => (
                                                            <CommandItem
                                                                key={v.id}
                                                                value={v.name}
                                                                onSelect={() => { setVendorId(v.id.toString()); setVendorPopoverOpen(false) }}
                                                                className="text-xs"
                                                            >
                                                                <Check className={cn("mr-2 h-3 w-3", vendorId === v.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                {v.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-semibold text-gray-500 uppercase">Referencia</Label>
                                        <Input placeholder="Ej: PED-001" value={referenceCode} onChange={e => setReferenceCode(e.target.value)} className="bg-gray-50 border-gray-200 h-8 text-xs" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-semibold text-gray-500 uppercase">Notas</Label>
                                        <Input placeholder="Observaciones..." value={notes} onChange={e => setNotes(e.target.value)} className="bg-gray-50 border-gray-200 h-8 text-xs" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Buscador + filtros */}
                        <div className="flex gap-2 mb-3 shrink-0">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar producto..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-white border-gray-200 text-sm h-9"
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-44 bg-white border-gray-200 text-xs h-9">
                                    <Filter className="w-3 h-3 mr-1 text-gray-400" />
                                    <SelectValue placeholder="Categoría" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                    <SelectItem value="all">Todas</SelectItem>
                                    {categories.map((cat: any) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Grid de productos - SCROLLABLE */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin bg-white rounded-xl border border-gray-200 p-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                {filteredProducts.map(product => (
                                    <div
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="text-left p-2.5 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                                    >
                                        <p className="text-xs font-black text-black truncate">{product.productName}</p>
                                        <p className="text-[9px] text-gray-500 mt-0.5 truncate">
                                            {product.sku || product.barcode || `#${product.id}`}
                                        </p>
                                        <div className="flex items-center justify-between mt-1.5">
                                            <span className={cn(
                                                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                                product.currentStock > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                            )}>
                                                {product.currentStock || 0}
                                            </span>
                                            <Plus className="w-3 h-3 text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {filteredProducts.length === 0 && (
                                <p className="text-center text-gray-400 text-sm py-8">
                                    {searchTerm ? "No se encontraron productos" : "No hay productos registrados"}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ─── COLUMNA DERECHA: Carrito + Historial ─── */}
                    <div className="w-[380px] flex flex-col gap-3 min-h-0 shrink-0">
                        {/* Carrito */}
                        <Card className="border-gray-200 bg-white shadow-sm flex-1 flex flex-col min-h-0">
                            <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b border-gray-200 py-2 px-4 shrink-0">
                                <CardTitle className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-primary" />
                                    Carga
                                    {cart.length > 0 && (
                                        <Badge variant="secondary" className="text-[9px] h-4">{cart.length}</Badge>
                                    )}
                                </CardTitle>
                                {cart.length > 0 && (
                                    <Button size="sm" variant="ghost" onClick={clearCart} className="text-red-500 hover:text-red-600 text-[10px] h-6">
                                        <Trash2 className="w-3 h-3 mr-1" /> Vaciar
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-thin">
                                {cart.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-xs">Click en un producto para agregar</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {cart.map(item => (
                                            <div key={item.product.id} className="p-3 hover:bg-gray-50">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-gray-800 truncate">{item.product.productName}</p>
                                                        <p className="text-[9px] text-gray-500">${item.unitCost.toLocaleString()} / ud</p>
                                                    </div>
                                                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-600 ml-2">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                                        <button
                                                            onClick={() => updateCartItem(item.product.id, 'quantity', item.quantity - 1)}
                                                            className="h-7 w-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600"
                                                        >
                                                            <span className="text-xs font-bold">-</span>
                                                        </button>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={e => updateCartItem(item.product.id, 'quantity', Number(e.target.value))}
                                                            className="h-7 w-12 text-center text-xs border-0 bg-white p-0"
                                                        />
                                                        <button
                                                            onClick={() => updateCartItem(item.product.id, 'quantity', item.quantity + 1)}
                                                            className="h-7 w-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600"
                                                        >
                                                            <span className="text-xs font-bold">+</span>
                                                        </button>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.unitCost || ""}
                                                        onChange={e => updateCartItem(item.product.id, 'unitCost', Number(e.target.value))}
                                                        placeholder="Costo"
                                                        className="h-7 flex-1 text-center text-[10px] bg-gray-50 border-gray-200"
                                                    />
                                                    <span className="text-xs font-black text-gray-800 w-20 text-right">
                                                        ${(item.quantity * item.unitCost).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            {cart.length > 0 && (
                                <div className="p-3 border-t border-gray-200 bg-gray-50 shrink-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-500">{cartItems} unidades · {cart.length} productos</span>
                                        <span className="text-sm font-black text-green-600">${cartTotal.toLocaleString()}</span>
                                    </div>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-9 text-xs"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                                        ) : (
                                            <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar Carga</>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </Card>

                        {/* Historial */}
                        <Card className="border-gray-200 bg-white shadow-sm h-[250px] flex flex-col shrink-0">
                            <CardHeader className="bg-gray-50 border-b border-gray-200 py-2 px-4 shrink-0">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-primary" />
                                        Historial
                                    </CardTitle>
                                    <Select value={historyVendorFilter} onValueChange={setHistoryVendorFilter}>
                                        <SelectTrigger className="h-6 text-[10px] bg-white border-gray-200 w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-gray-200">
                                            <SelectItem value="all">Todos</SelectItem>
                                            {vendors.map(v => (
                                                <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-thin">
                                {filteredHistory.length === 0 ? (
                                    <div className="p-6 text-center text-gray-400 text-xs">
                                        Sin cargas
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

                {/* ─── MODAL NUEVO PRODUCTO ─── */}
                <Dialog open={newProductOpen} onOpenChange={setNewProductOpen}>
                    <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" />
                                Nuevo Producto
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-gray-500 uppercase">Nombre del Producto *</Label>
                                <Input
                                    value={newProductForm.productName}
                                    onChange={e => setNewProductForm({ ...newProductForm, productName: e.target.value })}
                                    placeholder="Ej: Arroz 1kg"
                                    className="bg-gray-50 border-gray-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-gray-500 uppercase">SKU / Referencia</Label>
                                    <Input
                                        value={newProductForm.sku}
                                        onChange={e => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                                        placeholder="Opcional"
                                        className="bg-gray-50 border-gray-200"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-gray-500 uppercase">Categoría</Label>
                                    <Select value={newProductForm.categoryId} onValueChange={v => setNewProductForm({ ...newProductForm, categoryId: v })}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-gray-200">
                                            {categories.map((cat: any) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-gray-500 uppercase">Unidad de Medida</Label>
                                <Select value={newProductForm.unitOfMeasure} onValueChange={v => setNewProductForm({ ...newProductForm, unitOfMeasure: v })}>
                                    <SelectTrigger className="bg-gray-50 border-gray-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        <SelectItem value="unidad">Unidad</SelectItem>
                                        <SelectItem value="paquete">Paquete</SelectItem>
                                        <SelectItem value="caja">Caja</SelectItem>
                                        <SelectItem value="metro">Metro</SelectItem>
                                        <SelectItem value="docena">Docena</SelectItem>
                                        <SelectItem value="par">Par</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setNewProductOpen(false)} className="text-gray-600">
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateProduct}
                                disabled={creatingProduct || !newProductForm.productName.trim()}
                                className="bg-primary hover:bg-primary/90 text-white font-bold"
                            >
                                {creatingProduct ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4 mr-2" /> Crear Producto</>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
