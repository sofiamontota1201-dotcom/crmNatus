import 'server-only'
import { DianClient } from '@/lib/integrations/dianClient'

export async function apiLogin(params?: { username?: string; password?: string }) {
  const client = new DianClient()
  return client.login(params)
}

export async function insertInvoice(params: { invoiceData: any; token: string }) {
  const client = new DianClient()
  return client.insertInvoice(params)
}

export async function getDocumentStatus(params: { documentId: string | number; token: string; documentType?: string }) {
  const client = new DianClient()
  return client.getDocumentStatus(params)
}
