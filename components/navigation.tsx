"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Package, Users, Tag, TrendingUp, Home, FileText, ShoppingCart, Menu, 
  ChevronLeft, ChevronDown, LogOut, Sparkles, Receipt, MapPin, LayoutGrid, 
  Boxes, Zap, PieChart, Shield, Warehouse, CreditCard, BarChart3, 
  UserCheck, Truck, ClipboardList, ShoppingBag, Calculator, History,
  AlertTriangle, RotateCcw, Star, Banknote
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

const navigationSections = [
  {
    title: "General",
    icon: LayoutGrid,
    requiredPermission: null,
    items: [
      { name: "Dashboard", href: "/", icon: Home },
    ]
  },
  {
    title: "Productos & Listas",
    icon: ShoppingBag,
    requiredPermission: "inventory_view",
    items: [
      { name: "Productos", href: "/products", icon: Package },
      { name: "Categorias", href: "/categories", icon: Tag },
      { name: "Servicios", href: "/services", icon: Zap },
    ]
  },
  {
    title: "Inventario",
    icon: Warehouse,
    requiredPermission: "inventory_view",
    items: [
      { name: "Stock General", href: "/stock", icon: Boxes },
    ]
  },
  {
    title: "Caja & POS",
    icon: Calculator,
    requiredPermission: "pos_view",
    items: [
      { name: "Punto de Venta", href: "/sells", icon: ShoppingCart },
      { name: "Historial Ventas", href: "/sales-history", icon: History },
      { name: "Soporte Facturas", href: "/soportes", icon: Receipt },
      { name: "Facturacion Electronica", href: "/facturacion-electronica", icon: FileText },
    ]
  },
  {
    title: "CRM & Clientes",
    icon: UserCheck,
    requiredPermission: "customers_view",
    items: [
      { name: "Base Clientes", href: "/customers", icon: Users },
    ]
  },
  {
    title: "Proveedores & Compras",
    icon: Truck,
    requiredPermission: "inventory_view",
    items: [
      { name: "Proveedores", href: "/vendors", icon: Truck },
    ]
  },
  {
    title: "Reportes",
    icon: PieChart,
    requiredPermission: "reports_view",
    items: [
      { name: "Gestor de Reportes", href: "/reports", icon: BarChart3 },
    ]
  },
  {
    title: "Administracion",
    icon: Shield,
    requiredPermission: "employees_view",
    items: [
      { name: "Empleados", href: "/employees", icon: Users },
      { name: "Roles y Permisos", href: "/roles-permissions", icon: Shield },
    ]
  },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    const activeSection = navigationSections.find(s => s.items.some(item => item.href === "/"))
    return activeSection ? [activeSection.title] : []
  })
  const [visibleSections, setVisibleSections] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const toggleSection = (title: string) => {
    if (isCollapsed) setIsCollapsed(false)
    setExpandedSections(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    )
  }

  useEffect(() => {
    // Mostrar todos los modulos sin verificar permisos
    const allTitles = navigationSections.map(s => s.title)
    setVisibleSections(allTitles)
    setLoading(false)
  }, [])

  useEffect(() => {
    setMounted(true)
    const savedState = localStorage.getItem("sidebarCollapsed")
    if (savedState !== null) {
      setIsCollapsed(savedState === "true")
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebarCollapsed", isCollapsed.toString())
    }
  }, [isCollapsed, mounted])

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const activeSection = navigationSections.find(s => s.items.some(item => pathname === item.href))
    if (activeSection) {
      setExpandedSections(prev => prev.includes(activeSection.title) ? prev : [...prev, activeSection.title])
    }
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (!mounted) return null

  const filteredSections = navigationSections.filter(section => visibleSections.includes(section.title))

  return (
    <>
      {/* Mobile Trigger */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button 
          onClick={() => setIsMobileOpen(!isMobileOpen)} 
          className="h-12 w-12 p-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 border-0 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <motion.nav
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 280,
        }}
        transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
        className={cn(
          "fixed h-[95vh] left-4 top-[2.5vh] rounded-3xl z-40 hidden md:flex flex-col",
          "bg-white border border-gray-200/80 text-gray-700",
          "overflow-hidden shadow-lg"
        )}
      >
        <div className="flex flex-col h-full relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-800">
                    CRM<span className="font-light text-primary"> Natus</span>
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full ml-auto"
            >
              <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", isCollapsed && "rotate-180")} />
            </Button>
          </div>

          {/* Links */}
          <div className="flex-1 overflow-y-auto scrollbar-none px-3 space-y-2 pb-6">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-10 bg-gray-100 rounded-xl" />
                    <div className="h-8 bg-gray-50 rounded-lg ml-2" />
                    <div className="h-8 bg-gray-50 rounded-lg ml-2" />
                  </div>
                ))}
              </div>
            ) : (
              filteredSections.map((section) => {
                const isExpanded = expandedSections.includes(section.title)
                const hasActiveChild = section.items.some(item => pathname === item.href)
                const SectionIcon = section.icon

                return (
                  <div key={section.title} className="space-y-1">
                    <button
                      onClick={() => toggleSection(section.title)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300",
                        "hover:bg-gray-100 group",
                        hasActiveChild && !isExpanded ? "text-primary bg-primary/5" : "text-gray-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <SectionIcon className={cn("w-5 h-5", hasActiveChild ? "text-primary" : "group-hover:text-gray-700")} />
                        {!isCollapsed && (
                          <span className="text-xs font-bold uppercase tracking-wider">{section.title}</span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {(isExpanded || isCollapsed) && (
                        <motion.ul
                          initial={isCollapsed ? { height: 0 } : { height: 0, opacity: 0 }}
                          animate={isCollapsed ? { height: "auto" } : { height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden space-y-1 ml-2 border-l border-gray-200"
                        >
                          {section.items.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  prefetch
                                  className={cn(
                                    "group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden",
                                    isActive
                                      ? "text-primary font-semibold"
                                      : "text-gray-400 hover:text-gray-700"
                                  )}
                                  title={isCollapsed ? item.name : undefined}
                                >
                                  {isActive && (
                                    <motion.div
                                      layoutId="activeTab"
                                      className="absolute inset-0 bg-primary/5 border-l-2 border-primary"
                                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                  )}

                                  <Icon className={cn("w-4 h-4 flex-shrink-0 relative z-10", isActive && "text-primary")} />

                                  {!isCollapsed && (
                                    <motion.span className="relative z-10 truncate text-sm">
                                      {item.name}
                                    </motion.span>
                                  )}
                                </Link>
                              </li>
                            )
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer / Logout */}
          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <Button
              variant="ghost"
              className={cn(
                "w-full flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors",
                isCollapsed ? "justify-center px-0" : "justify-start px-4"
              )}
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span>Cerrar sesion</span>}
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Nav Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile Nav Drawer */}
      <nav
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 md:hidden flex flex-col shadow-xl",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-gray-200 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">CRM Natus</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-10 bg-gray-100 rounded-xl" />
                  <div className="h-8 bg-gray-50 rounded-lg ml-4" />
                </div>
              ))}
            </div>
          ) : (
            filteredSections.map((section) => {
              const isExpanded = expandedSections.includes(section.title)
              const hasActiveChild = section.items.some(item => pathname === item.href)
              const SectionIcon = section.icon

              return (
                <div key={section.title} className="space-y-1">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
                      hasActiveChild ? "bg-primary/10 text-primary" : "text-gray-500"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <SectionIcon className="h-5 w-5" />
                      <span className="text-sm font-bold uppercase tracking-wider">{section.title}</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1 ml-4 border-l border-gray-200"
                      >
                        {section.items.map((item) => {
                          const isActive = pathname === item.href
                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                  isActive 
                                    ? "text-primary font-bold" 
                                    : "text-gray-400 hover:text-gray-700"
                                )}
                                onClick={() => setIsMobileOpen(false)}
                              >
                                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} /> 
                                <span className="text-sm">{item.name}</span>
                              </Link>
                            </li>
                          )
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="mr-2 h-5 w-5" /> Cerrar Sesion
          </Button>
        </div>
      </nav>

      {/* Spacer for desktop main content */}
      <motion.div
        animate={{ width: isCollapsed ? 100 : 300 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
        className="hidden md:block flex-shrink-0"
      />
    </>
  )
}
