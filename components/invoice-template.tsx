import type { Sell, SellDetail, Customer } from "@/types/domain"

interface InvoiceTemplateProps {
  sell: Sell
  details: SellDetail[]
  customer: Customer
}

export function InvoiceTemplate({ sell, details, customer }: InvoiceTemplateProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">FACTURA</h2>
        <p className="text-gray-600">Sistema de Gestión de Inventarios</p>
      </div>

      <div className="flex justify-between mb-6">
        <div>
          <h3 className="font-bold">Cliente:</h3>
          <p>{customer.customerName}</p>
          <p>{customer.address || ""}</p>
          <p>{customer.phone || ""}</p>
          <p>{customer.email || ""}</p>
        </div>
        <div className="text-right">
          <h3 className="font-bold">Factura #:</h3>
          <p>{sell.id}</p>
          <h3 className="font-bold mt-2">Fecha:</h3>
          <p>{sell.sellDate || formatDate(sell.createdAt)}</p>
        </div>
      </div>

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="py-2 text-left">Descripción</th>
            <th className="py-2 text-right">Cantidad</th>
            <th className="py-2 text-right">Precio Unit.</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {details.map((detail, index) => (
            <tr key={index} className="border-b">
              <td className="py-2">{detail.stock?.product?.productName || 'Producto desconocido'}</td>
              <td className="py-2 text-right">{detail.soldQuantity}</td>
              <td className="py-2 text-right">${detail.soldPrice.toFixed(2)}</td>
              <td className="py-2 text-right">${detail.totalSoldPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 text-right font-medium">
              Subtotal:
            </td>
            <td className="py-2 text-right font-medium">
              ${(sell.totalAmount + (sell.discountAmount || 0)).toFixed(2)}
            </td>
          </tr>
          {sell.discountAmount > 0 && (
            <tr>
              <td colSpan={3} className="py-2 text-right font-medium">
                Descuento:
              </td>
              <td className="py-2 text-right font-medium">-${sell.discountAmount.toFixed(2)}</td>
            </tr>
          )}
          <tr className="border-t-2 border-gray-300">
            <td colSpan={3} className="py-2 text-right font-bold">
              Total:
            </td>
            <td className="py-2 text-right font-bold">${sell.totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-8 pt-8 border-t">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-2">Método de Pago:</h3>
            <p>
              {sell.paymentMethod === 0 && "Efectivo"}
              {sell.paymentMethod === 1 && "Tarjeta"}
              {sell.paymentMethod === 2 && "Transferencia"}
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Estado de Pago:</h3>
            <p>
              {sell.paymentStatus === 1 ? (
                <span className="text-green-600">PAGADO</span>
              ) : (
                <span className="text-red-600">PENDIENTE</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t text-center text-sm text-gray-600">
        <p>Gracias por su compra</p>
        <p>Sistema de Gestión de Inventarios</p>
      </div>
    </div>
  )
}
