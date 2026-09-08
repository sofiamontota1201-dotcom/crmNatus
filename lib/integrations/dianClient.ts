import 'server-only'

type LoginParams = { username?: string; password?: string }
type InsertInvoiceParams = { invoiceData: any; token: string }
type GetStatusParams = { documentId: string | number; token: string; documentType?: string }

export class DianClient {
  private readonly baseUrl: string
  private readonly defaultUsername?: string
  private readonly defaultPassword?: string

  constructor(options?: { baseUrl?: string; username?: string; password?: string }) {
    const envBase = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL
    if (!options?.baseUrl && !envBase) {
      throw new Error('API_BASE_URL/NEXT_PUBLIC_API_BASE_URL is not set')
    }
    this.baseUrl = (options?.baseUrl || envBase!).replace(/\/$/, '')
    this.defaultUsername = options?.username ?? process.env.API_USERNAME
    this.defaultPassword = options?.password ?? process.env.API_PASSWORD
  }

  async login(params?: LoginParams) {
    const username = params?.username ?? this.defaultUsername
    const password = params?.password ?? this.defaultPassword
    if (!username || !password) throw new Error('API credentials (API_USERNAME/API_PASSWORD) are not configured')

    const url = `${this.baseUrl}/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' })
    if (!res.ok) {
      let details: any
      try { details = await res.json() } catch {}
      const e: any = new Error(details?.error || details?.message || `Login failed ${res.status}`)
      e.status = res.status; e.details = details
      throw e
    }
    return res.json()
  }

  async insertInvoice({ invoiceData, token }: InsertInvoiceParams) {
    if (!invoiceData) throw new Error('invoiceData is required')
    if (!token) throw new Error('token is required')
    const res = await fetch(`${this.baseUrl}/insertinvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `misfacturas ${token}` },
      body: JSON.stringify(invoiceData),
      cache: 'no-store',
    })
    if (!res.ok) {
      let details: any
      try { details = await res.json() } catch {}
      const e: any = new Error(details?.error || details?.message || `Insert invoice failed ${res.status}`)
      e.status = res.status; e.details = details
      throw e
    }
    return res.json()
  }

  async getDocumentStatus({ documentId, token, documentType = '01' }: GetStatusParams) {
    if (!documentId) throw new Error('documentId is required')
    if (!token) throw new Error('token is required')
    const payload = { DocumentId: typeof documentId === 'number' ? documentId : String(documentId), DocumentType: documentType }
    const res = await fetch(`${this.baseUrl}/GetDocumentStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `misfacturas ${token}` },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    if (!res.ok) {
      let details: any
      try { details = await res.json() } catch {}
      const e: any = new Error(details?.error || details?.message || `Get status failed ${res.status}`)
      e.status = res.status; e.details = details
      throw e
    }
    return res.json()
  }
}

