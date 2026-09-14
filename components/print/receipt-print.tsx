"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

/**
 * Formato de impresión para impresora térmica (80 mm) extraído de restaurant-proyect.
 * Formato original: font monospace, ancho 320px, título centrado 22px,
 * separadores <hr>, lista de productos sin viñetas, total 18px en negrita.
 *
 * Encabezado actualizado con los datos de facturación de VARIEDADES NATU.
 */

export const BILLING_INFO = {
  businessName: "VARIEDADES NATU",
  owner: "MARTHA LILIANA OROZCO",
  nit: "53890412-1",
  address: "CARRERA 8 # 5-27 CENTRO",
  city: "PALOCABILDO, TOLIMA",
}

export interface ReceiptItem {
  id: number | string
  name: string
  quantity: number
  price: number
}

export interface ReceiptData {
  receiptNumber?: string | null
  customerName?: string | null
  date: string
  items: ReceiptItem[]
  total: number
  paymentMethod?: string | null
  discount?: number
}

export interface ReceiptPrintHandle {
  print: () => void
}

export const ReceiptPrint = forwardRef<ReceiptPrintHandle, { data: ReceiptData | null }>(
  function ReceiptPrint({ data }, ref) {
    const printRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      print: () => {
        setTimeout(() => {
          if (printRef.current) window.print()
        }, 300)
      },
    }))

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
      }).format(amount)

    return (
      <>
        <style>{`
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
        `}</style>

        {data && (
          <div style={{ display: "none" }}>
            <div ref={printRef} id="receipt-print-section" style={{ fontFamily: "monospace", width: 320 }}>
              <h1 style={{ textAlign: "center", margin: 0, fontSize: 22 }}>{BILLING_INFO.businessName}</h1>
              <p style={{ textAlign: "center", margin: "4px 0 0 0" }}>{BILLING_INFO.owner}</p>
              <p style={{ textAlign: "center", margin: 0 }}>NIT {BILLING_INFO.nit}</p>
              <p style={{ textAlign: "center", margin: 0 }}>{BILLING_INFO.address}</p>
              <p style={{ textAlign: "center", margin: "0 0 8px 0" }}>{BILLING_INFO.city}</p>
              <h2 style={{ textAlign: "center", marginBottom: 8 }}>Ticket de Venta</h2>

              {data.receiptNumber && <p><b>No.:</b> {data.receiptNumber}</p>}
              <p><b>Fecha:</b> {new Date(data.date).toLocaleString("es-ES")}</p>
              {data.customerName && <p><b>Cliente:</b> {data.customerName}</p>}
              <hr />

              <h3 style={{ margin: "8px 0 4px 0" }}>Productos</h3>
              <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                {data.items.map((item) => (
                  <li key={item.id} style={{ marginBottom: 4 }}>
                    {item.name} x{item.quantity} - {formatCurrency(item.price)}
                  </li>
                ))}
              </ul>
              <hr />

              {!!data.discount && (
                <p style={{ margin: "4px 0" }}>
                  <b>Descuento:</b> {formatCurrency(data.discount)}
                </p>
              )}
              <p style={{ fontSize: 18, margin: "8px 0" }}><b>Total: {formatCurrency(data.total)}</b></p>
              <p><b>Método de pago:</b> {data.paymentMethod || "-"}</p>
              <p style={{ textAlign: "center", marginTop: 12 }}>¡Gracias por su compra!</p>
            </div>
          </div>
        )}
      </>
    )
  },
)
