// Backward-compatible functional exports that delegate to the DianClient OOP implementation
import { DianClient } from '@/lib/integrations/dianClient'

export async function iniciarSesionDian(params?: { username?: string; password?: string }) {
  const client = new DianClient()
  return client.login(params)
}

export async function insertarFacturaDian(params: { invoiceData: any; token: string }) {
  const client = new DianClient()
  return client.insertInvoice(params)
}

export async function consultarEstadoDocumentoDian(params: { documentId: string | number; token: string; documentType?: string }) {
  const client = new DianClient()
  return client.getDocumentStatus(params)
}
