import { api } from './api'

/**
 * Διεύθυνση εισόδου στη βιντεοκλήση μιας τηλεσυνεδρίας.
 *
 * Ο server (GET /telehealth/:id/call) αποφασίζει πού γίνεται η κλήση και
 * ελέγχει ότι ο καλών είναι ο πελάτης ή ο πάροχος της πληρωμένης συνεδρίας:
 *   − JaaS: { domain: '8x8.vc', room: '<APP_ID>/<δωμάτιο>', jwt }
 *     → https://8x8.vc/<APP_ID>/<δωμάτιο>?jwt=<jwt>
 *   − χωρίς JaaS: { domain: 'meet.jit.si', room: <meeting_url>, jwt: null }
 *     → https://meet.jit.si/<meeting_url>  (ίδιο με πριν)
 *
 * Κάθε τμήμα του room κωδικοποιείται χωριστά, ώστε η «/» μετά το App ID να
 * μείνει διαχωριστικό διαδρομής.
 */
export async function getTelehealthCallUrl(consultationId: string): Promise<string> {
  const r = await api.get(`/telehealth/${consultationId}/call`)
  const info = r.data?.data ?? r.data
  if (!info?.domain || !info?.room) throw new Error('call')
  const path = String(info.room).split('/').map(encodeURIComponent).join('/')
  const jwt = info.jwt ? `?jwt=${encodeURIComponent(String(info.jwt))}` : ''
  return `https://${info.domain}/${path}${jwt}`
}
