# Formato de impresión — Ticket de venta (impresora térmica 80 mm)

Formato extraído del proyecto `restaurant-proyect` (`Componentes/Ordenes/order-list.tsx`, ticket impreso con `window.print()` sobre un div oculto) y adaptado para crmNatus.

## Componente
`crmNatus/components/print/receipt-print.tsx`

Uso:

```tsx
import { useRef } from "react"
import { ReceiptPrint, type ReceiptPrintHandle, type ReceiptData } from "@/components/print/receipt-print"

const receiptRef = useRef<ReceiptPrintHandle>(null)

const data: ReceiptData = {
  receiptNumber: "FEVP-196168",
  customerName: "Cliente X",
  date: new Date().toISOString(),
  items: [{ id: 1, name: "Producto", quantity: 2, price: 5000 }],
  total: 10000,
  paymentMethod: "Efectivo",
}

<ReceiptPrint ref={receiptRef} data={data} />
// Al imprimir:
receiptRef.current?.print()
```

## Medidas y estilos (formato exacto del original)
| Propiedad | Valor |
|---|---|
| Fuente | `monospace` |
| Ancho de papel | `320px` (≈ 80 mm térmico) |
| Título (razón social) | `<h1>` centrado, `fontSize: 22px`, `margin: 0` |
| Subtítulo | `<h2>` centrado, `marginBottom: 8px` |
| Separadores | `<hr />` |
| Lista de productos | `<ul>` `paddingLeft: 0`, `listStyle: none`; cada `<li>` `marginBottom: 4px` |
| Formato de línea de producto | `nombre x{cantidad} - {precio}` |
| Total | `<p>` `fontSize: 18px`, `margin: 8px 0`, negrita |
| Moneda | `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" })` |
| Impresión | `window.print()` con delay de 300 ms |

## CSS de impresión (añadido)
El original no tenía `@media print`, por lo que imprimía toda la página. En el componente se agregó:

```css
@media print {
  body * { visibility: hidden; }
  #receipt-print-section, #receipt-print-section * { visibility: visible; }
  #receipt-print-section {
    position: absolute;
    left: 0;
    top: 0;
    width: 320px;
  }
}
```

En el diálogo de impresión elegir la impresora térmica y tamaño de papel **80 mm** (o "Receipt"), sin márgenes.

## Datos de facturación (encabezado)
Definidos en `BILLING_INFO` dentro del componente:

| Campo | Valor |
|---|---|
| Razón social | VARIEDADES NATU |
| Titular | MARTHA LILIANA OROZCO |
| NIT | 53890412-1 |
| Dirección | CARRERA 8 # 5-27 CENTRO |
| Ciudad | PALOCABILDO, TOLIMA |

Referencia adicional del repo original: la factura en PDF (`Componentes/billing/invoice-list.tsx`) usa jsPDF A4 con `autoPrint` — no es el formato térmico.
