import { createPrivateKey, createSign, type KeyObject } from 'crypto'

/**
 * JaaS (8x8 Jitsi as a Service) — υπογραφή JWT για βιντεοκλήσεις.
 *
 * ΓΙΑΤΙ
 *   Το δημόσιο meet.jit.si κόβει τις ενσωματωμένες κλήσεις στα ~5 λεπτά.
 *   Με JaaS η κλήση τρέχει στο 8x8.vc, σε δωμάτια του δικού μας λογαριασμού,
 *   και η είσοδος γίνεται μόνο με JWT που υπογράφουμε εμείς.
 *
 * ΡΥΘΜΙΣΗ (Railway)
 *   JAAS_APP_ID       vpaas-magic-cookie-…            (App ID της κονσόλας JaaS)
 *   JAAS_KID          vpaas-magic-cookie-…/abc123     (το «Key ID» του API key)
 *   JAAS_PRIVATE_KEY  -----BEGIN PRIVATE KEY----- …   (το .pk που κατεβάζεις· τα \n
 *                     μπορούν να έρθουν ως κυριολεκτικό "\n")
 *   Αν λείπει έστω ένα, ή το κλειδί δεν διαβάζεται, getJaasConfig() επιστρέφει
 *   null και ο καλών πέφτει στο meet.jit.si όπως πριν.
 *
 * Η υπογραφή γίνεται με το crypto του Node (RS256) — χωρίς εξωτερική βιβλιοθήκη.
 */

export type JaasConfig = { appId: string; kid: string; key: KeyObject }

let cached: { sig: string; cfg: JaasConfig | null } | null = null

export function getJaasConfig(env: NodeJS.ProcessEnv = process.env): JaasConfig | null {
  const appId = (env.JAAS_APP_ID || '').trim()
  const kid = (env.JAAS_KID || '').trim()
  const raw = env.JAAS_PRIVATE_KEY || ''
  if (!appId || !kid || !raw.trim()) return null

  const sig = `${appId}|${kid}|${raw.length}`
  if (cached && cached.sig === sig) return cached.cfg

  let cfg: JaasConfig | null = null
  try {
    // Railway/.env συχνά κρατούν το PEM σε μία γραμμή με "\n" και ίσως εισαγωγικά.
    const pem = raw.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')
    cfg = { appId, kid, key: createPrivateKey(pem) }
  } catch (err: any) {
    console.error('[jaas] JAAS_PRIVATE_KEY δεν διαβάζεται — χρήση meet.jit.si:', err?.message)
  }
  cached = { sig, cfg }
  return cfg
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

export type JaasUser = { id: string; name: string; email: string; avatar?: string | null; moderator: boolean }

/**
 * JWT κατά την τεκμηρίωση JaaS: aud 'jitsi', iss 'chat', sub = App ID,
 * room = το όνομα του δωματίου ΧΩΡΙΣ το πρόθεμα App ID.
 */
export function signJaasJwt(
  cfg: JaasConfig,
  room: string,
  user: JaasUser,
  opts: { ttlSeconds?: number; now?: number } = {},
): string {
  const now = Math.floor((opts.now ?? Date.now()) / 1000)
  const header = { alg: 'RS256', typ: 'JWT', kid: cfg.kid }
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: cfg.appId,
    room,
    iat: now,
    nbf: now - 10,
    exp: now + (opts.ttlSeconds ?? 2 * 60 * 60),
    context: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        ...(user.avatar ? { avatar: user.avatar } : {}),
        moderator: user.moderator ? 'true' : 'false',
      },
      features: {
        livestreaming: 'false',
        recording: 'false',
        transcription: 'false',
        'outbound-call': 'false',
      },
    },
  }
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signature = createSign('RSA-SHA256').update(input).end().sign(cfg.key)
  return `${input}.${b64url(signature)}`
}
