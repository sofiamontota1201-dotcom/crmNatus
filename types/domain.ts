// ============================================================
// CRM Natus - Domain Types
// Basado en especificacion de modulos para Papeleria
// ============================================================

// --- BASE ENTITIES ---

export interface Vendor {
  id: number
  name: string
  phone: string
  email?: string
  address?: string
  nit?: string
  contactPerson?: string
  paymentTerms?: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: number
  name: string
  parentId?: number | null
  status: number
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: number
  customerName: string
  cedula?: string
  nit?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  latitude?: number
  longitude?: number
  // CRM fields
  customerProfile: CustomerProfile
  creditEnabled: boolean
  creditLimit: number
  creditDays: number
  currentBalance: number
  loyaltyPoints: number
  totalPurchases: number
  lastPurchaseDate?: string | null
  status: number
  createdAt: string
  updatedAt: string
}

export type CustomerProfile = 'detal' | 'frecuente' | 'empresa' | 'mayorista'

export interface Prospect {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  city?: string
  latitude?: number
  longitude?: number
  notes?: string
  status: 'new' | 'contacted' | 'negotiating' | 'converted'
  createdAt: string
  updatedAt: string
}

// --- MODULE 1: PRODUCTOS & LISTAS DE PRECIOS ---

export interface ProductCategoryRef { name: string }
export interface StockVendorRef { name: string; phone?: string }
export interface StockCategoryRef { name: string }
export interface StockProductRef { productName: string; details?: string | null; status: number }

export interface Product {
  id: number
  categoryId?: number | null
  vendorId?: number | null
  productName: string
  sku?: string | null
  barcode?: string | null
  details?: string | null
  unitType?: string | null
  minStock?: number | null
  idealStock?: number | null
  costPrice?: number | null
  status: number
  createdAt: string
  updatedAt: string
  categories?: ProductCategoryRef
  vendors?: StockVendorRef
  stocks?: { currentQuantity: number; buyingPrice: number; sellingPrice: number }[]
}

export type UnitOfMeasure = 'unidad' | 'paquete' | 'caja' | 'metro' | 'pliego' | 'rolo' | 'docena' | 'par'

export interface ProductVariant {
  id: number
  productId: number
  variantName: string
  sku?: string
  barcode?: string
  unitOfMeasure: UnitOfMeasure
  conversionFactor: number
  buyPrice: number
  sellPrice: number
  stockQuantity: number
  status: number
  createdAt: string
  updatedAt: string
}

export interface PriceList {
  id: number
  name: string
  customerProfile: CustomerProfile
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PriceListItem {
  id: number
  priceListId: number
  productId: number
  price: number
  minQuantity: number
  maxQuantity?: number | null
  discountPercent: number
  createdAt: string
  updatedAt: string
}

export interface VolumeDiscount {
  id: number
  productId?: number | null
  categoryId?: number | null
  minQuantity: number
  discountPercent: number
  fixedPrice?: number | null
  createdAt: string
  updatedAt: string
}

export interface Kit {
  id: number
  kitName: string
  description?: string
  totalPrice: number
  image?: string | null
  status: number
  createdAt: string
  updatedAt: string
}

export interface KitItem {
  id: number
  kitId: number
  productId: number
  quantity: number
  unitPrice: number
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: number
  serviceName: string
  description?: string
  price: number
  estimatedCost: number
  unitOfMeasure: string
  status: number
  createdAt: string
  updatedAt: string
}

// --- MODULE 2: INVENTARIO ---

export interface Stock {
  id: number
  categoryId?: number | null
  productId?: number | null
  vendorId?: number | null
  userId?: number | null
  productCode: string
  chalanNo: string
  buyingPrice: number
  sellingPrice: number
  discount: number
  stockQuantity: number
  currentQuantity: number
  minimumStock: number
  maximumStock?: number | null
  location?: string | null
  batchNumber?: string | null
  expiryDate?: string | null
  note?: string | null
  status: number
  createdAt: string
  updatedAt: string
  products?: StockProductRef
  vendors?: StockVendorRef
  categories?: StockCategoryRef
}

export type StockMovementType = 'entrada' | 'salida' | 'ajuste' | 'merma' | 'devolucion' | 'transferencia' | 'venta' | 'desempaquetado'

export interface StockMovement {
  id: number
  stockId: number
  productId: number
  movementType: StockMovementType
  quantity: number
  previousQuantity: number
  newQuantity: number
  unitCost: number
  totalCost: number
  referenceId?: number | null
  referenceType?: string | null
  reason?: string | null
  notes?: string | null
  userId?: number | null
  approvedBy?: number | null
  approvedAt?: string | null
  createdAt: string
}

export interface InventoryCount {
  id: number
  countDate: string
  status: 'pending' | 'in_progress' | 'completed' | 'approved'
  notes?: string | null
  userId?: number | null
  approvedBy?: number | null
  approvedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface InventoryCountItem {
  id: number
  countId: number
  stockId: number
  systemQuantity: number
  physicalQuantity: number
  difference: number
  reason?: string | null
  notes?: string | null
  createdAt: string
}

export interface StockAdjustment {
  id: number
  stockId: number
  adjustmentType: 'merma' | 'dano' | 'robo' | 'perdida' | 'descuadre' | 'otro'
  quantityBefore: number
  quantityAfter: number
  quantityDifference: number
  reason: string
  notes?: string | null
  userId?: number | null
  approvedBy?: number | null
  approvedAt?: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface UnpackRule {
  id: number
  productId: number
  parentStockId: number
  parentUnit: UnitOfMeasure
  childUnit: UnitOfMeasure
  conversionFactor: number
  autoUnpack: boolean
  createdAt: string
}

// --- MODULE 3: CAJA / POS ---

export interface CashRegisterSession {
  id: number
  employeeId?: number | null
  openingAmount: number
  closingAmount?: number | null
  expectedAmount?: number | null
  difference?: number | null
  status: 'open' | 'closed'
  openedAt: string
  closedAt?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'nequi' | 'daviplata' | 'transferencia' | 'credito'

export interface CashMovement {
  id: number
  sessionId: number
  movementType: 'ingreso' | 'egreso'
  concept: string
  amount: number
  paymentMethod: PaymentMethod
  referenceId?: number | null
  referenceType?: string | null
  userId?: number | null
  createdAt: string
}

export interface Arqueo {
  id: number
  sessionId: number
  efectivoCount: number
  tarjetaDebitoCount: number
  tarjetaCreditoCount: number
  nequiCount: number
  daviplataCount: number
  transferenciaCount: number
  totalSystem: number
  totalPhysical: number
  difference: number
  notes?: string | null
  userId?: number | null
  createdAt: string
}

export interface Sell {
  id: number
  userId?: number | null
  customerId?: number | null
  sessionId?: number | null
  branchId: number
  totalAmount: number
  paidAmount: number
  discountAmount: number
  discountPercent: number
  ivaAmount: number
  paymentMethod: number
  paymentStatus: SellPaymentStatus
  isQuote: boolean
  notes?: string | null
  sellDate?: string | null
  createdAt: string
  updatedAt: string
  customers?: Customer
}

export type SellPaymentStatus = 0 | 1 | 2 | 3 // 0=pendiente(express), 1=pagada, 2=credito_parcial, 3=anulada(devuelta)

export interface SellDetail {
  id: number
  stockId?: number | null
  sellId?: number | null
  productId?: number | null
  soldQuantity: number
  buyPrice: number
  soldPrice: number
  totalBuyPrice: number
  totalSoldPrice: number
  discount: number
  discountType: number
  discountAmount: number
  isService: boolean
  notes?: string | null
  createdAt: string
  updatedAt: string
  stock?: SellDetailStock
}

export interface SellDetailStock {
  id: number
  price: number
  product: SellDetailProductRef
}

export interface SellDetailProductRef {
  id: number
  productName: string
  description?: string
  unitPrice: number
  status: number
}

// --- MODULE 4: REPORTES ---

export interface Return {
  id: number
  sellId: number
  reason: string
  totalRefund: number
  status: 'pending' | 'approved' | 'completed' | 'rejected'
  processedBy?: number | null
  processedAt?: string | null
  notes?: string | null
  createdAt: string
}

export interface ReturnItem {
  id: number
  returnId: number
  sellDetailId: number
  quantity: number
  unitPrice: number
  refundAmount: number
  reason?: string | null
  createdAt: string
}

export interface VoidedInvoice {
  id: number
  sellId: number
  reason: string
  voidedBy?: number | null
  voidedAt: string
  reversedInventory: boolean
  notes?: string | null
  createdAt: string
}

// --- MODULE 5: CRM ---

export interface CreditAccount {
  id: number
  customerId: number
  creditLimit: number
  creditDays: number
  currentBalance: number
  availableCredit: number
  status: 'active' | 'suspended' | 'closed'
  createdAt: string
  updatedAt: string
}

export interface CreditTransaction {
  id: number
  accountId: number
  sellId?: number | null
  transactionType: 'charge' | 'payment' | 'adjustment'
  amount: number
  balanceAfter: number
  paymentMethod?: PaymentMethod | null
  notes?: string | null
  userId?: number | null
  createdAt: string
}

export interface LoyaltyProgram {
  id: number
  customerId: number
  totalPoints: number
  redeemedPoints: number
  availablePoints: number
  pointsPerPeso: number
  redemptionRate: number
  expiresAt?: string | null
  status: 'active' | 'expired' | 'suspended'
  createdAt: string
  updatedAt: string
}

export interface LoyaltyTransaction {
  id: number
  programId: number
  sellId?: number | null
  transactionType: 'earn' | 'redeem' | 'expire' | 'adjustment'
  points: number
  balanceAfter: number
  notes?: string | null
  createdAt: string
}

export interface Quotation {
  id: number
  customerId?: number | null
  customerName: string
  customerEmail?: string
  customerPhone?: string
  validUntil: string
  totalAmount: number
  discountAmount: number
  ivaAmount: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
  convertedSellId?: number | null
  notes?: string | null
  userId?: number | null
  createdAt: string
  updatedAt: string
}

export interface QuotationItem {
  id: number
  quotationId: number
  productId?: number | null
  serviceName?: string | null
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  createdAt: string
}

// --- MODULE 6: COMPLEMENTARIOS ---

export interface PurchaseOrder {
  id: number
  vendorId: number
  orderDate: string
  expectedDate?: string | null
  receivedDate?: string | null
  totalAmount: number
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  notes?: string | null
  userId?: number | null
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderItem {
  id: number
  orderId: number
  productId: number
  quantity: number
  receivedQuantity: number
  unitCost: number
  totalCost: number
  notes?: string | null
  createdAt: string
}

export interface PurchaseReceipt {
  id: number
  orderId?: number | null
  vendorId: number
  receiptDate: string
  totalAmount: number
  invoiceNumber?: string | null
  notes?: string | null
  userId?: number | null
  createdAt: string
}

// --- CHAT / AI ---

export interface ChatConversation {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolInvocations?: any
  createdAt: string
}

export interface ReorderAlert {
  id: string
  userId: string
  productId?: number
  stockId?: number
  threshold: number
  message: string
  status: 'active' | 'resolved' | 'dismissed'
  createdAt: string
  resolvedAt?: string
}

// --- ROLES & PERMISSIONS ---

export interface Role {
  id: number
  role_name: string
  description: string
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  name: string
  description: string
  module: string
  action: 'view' | 'create' | 'edit' | 'delete'
  created_at: string
}

export interface RolePermission {
  id: number
  role_id: number
  permission_id: number
  created_at: string
}

export interface Employee {
  id: number
  auth_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  role_id: number
  status: 'active' | 'inactive' | 'suspended'
  hire_date?: string
  created_by?: string
  created_at: string
  updated_at: string
  roles?: Role
  role_permissions?: RolePermission[]
}

export interface EmployeeWithRole extends Employee {
  role_name: string
  permissions: string[]
}

export interface AuditLog {
  id: number
  user_id: string
  action: string
  entity_type: string
  entity_id: number
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// --- CARGA DE MERCANCÍA ---

export interface MerchandiseLoad {
  id: number
  vendorId?: number | null
  referenceCode?: string | null
  notes?: string | null
  totalItems: number
  totalCost: number
  status: 'pending' | 'completed' | 'cancelled'
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  vendors?: { name: string; phone?: string; nit?: string }
  items?: MerchandiseLoadItem[]
}

export interface MerchandiseLoadItem {
  id: number
  loadId: number
  stockId?: number | null
  productId: number
  quantity: number
  unitCost: number
  totalCost: number
  createdAt: string
  products?: { product_name: string; sku?: string; barcode?: string }
}
