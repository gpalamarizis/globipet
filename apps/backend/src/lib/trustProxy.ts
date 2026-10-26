import { BlockList, isIP } from 'node:net'

/**
 * Αναγνώριση της πραγματικής IP πίσω από Railway (και ίσως Cloudflare).
 * Εξήγηση στο index.ts (σχόλιο «ΤΟ trustProxy ΔΕΝ ΕΙΝΑΙ ΠΡΟΑΙΡΕΤΙΚΟ ΕΔΩ»).
 *
 * Επίσημα δίκτυα του Cloudflare — πηγή: https://www.cloudflare.com/ips/
 * (https://www.cloudflare.com/ips-v4 και https://www.cloudflare.com/ips-v6).
 */
const CLOUDFLARE_IPV4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
]
const CLOUDFLARE_IPV6 = [
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
  '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
]
const cloudflareNets = new BlockList()
for (const c of CLOUDFLARE_IPV4) { const [a, p] = c.split('/'); cloudflareNets.addSubnet(a, Number(p), 'ipv4') }
for (const c of CLOUDFLARE_IPV6) { const [a, p] = c.split('/'); cloudflareNets.addSubnet(a, Number(p), 'ipv6') }

/** Η διεύθυνση ανήκει στο Cloudflare (και σε μορφή ::ffff:a.b.c.d). */
export function isCloudflareIp(address: string): boolean {
  const a = String(address ?? '').trim()
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(a)?.[1] ?? a
  try {
    if (isIP(v4) === 4) return cloudflareNets.check(v4, 'ipv4')
    if (isIP(a) === 6) return cloudflareNets.check(a, 'ipv6')
  } catch { /* μη έγκυρη διεύθυνση */ }
  return false
}

/**
 * Ε16: το άλμα Cloudflare εμπιστεύεται ΜΟΝΟ με TRUST_CLOUDFLARE_PROXY=1.
 *
 *   Το API καλείται απευθείας στο *.up.railway.app (όχι μέσω Cloudflare). Αν
 *   εμπιστευόμασταν πάντα ένα άλμα Cloudflare, οποιοσδήποτε θα έστελνε το
 *   αίτημα από ένα δικό του Cloudflare Worker (η IP εξόδου του είναι του
 *   Cloudflare) με πλαστό X-Forwarded-For: το req.ip θα ήταν όποια IP ήθελε
 *   → παράκαμψη κάθε ορίου ανά IP (login, register, forgot-password…).
 *
 *   Προεπιλογή: μόνο το άλμα 0 (ο proxy της Railway) — req.ip = η διεύθυνση
 *   που είδε η Railway. Το 1 ορίζεται ΜΟΝΟ όταν το API μπει πίσω από το
 *   Cloudflare (proxied DNS) ΚΑΙ η απευθείας πρόσβαση στο railway.app κλείσει.
 */
const TRUST_CLOUDFLARE = process.env.TRUST_CLOUDFLARE_PROXY === '1'

/** trustProxy: το άλμα της Railway (0) και, μόνο με TRUST_CLOUDFLARE_PROXY=1, ένα άλμα Cloudflare (1). */
export function trustProxyHop(address: string, hop: number): boolean {
  return hop === 0 || (TRUST_CLOUDFLARE && hop === 1 && isCloudflareIp(address))
}
