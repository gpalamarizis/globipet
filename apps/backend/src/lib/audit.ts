import prisma from './prisma.js'

/**
 * Audit-log helper — writes to the EXISTING `audit_logs` table.
 *
 * ─── Table shape (as it exists in the DB) ──────────────────────
 * Columns:
 *   id, action, resource, resource_id, actor_id, actor_email, actor_role,
 *   subject_email, metadata (Json), ip, user_agent, method, path,
 *   status_code, outcome, error_message, created_at
 *
 * ─── Design principles ─────────────────────────────────────────
 * • Fire-and-forget. Audit failures NEVER break the calling operation.
 * • Actor is derived from req.user automatically; caller only supplies
 *   the "what" (action, resource) and optional metadata.
 * • No plaintext secrets (passwords, tokens, encrypted payloads) in metadata.
 * • Method/path/IP/user-agent are captured for GDPR breach-investigation.
 */

export type AuditOutcome = 'success' | 'failure' | 'blocked'

export interface AuditParams {
  action:        string                       // e.g. 'login', 'password_reset_complete', 'data_export'
  resource:      string                       // e.g. 'user', 'consent', 'service', 'catalog_template'
  resource_id?:  string | null                // subject of the action
  subject_email?: string | null               // the user "receiving" the action (may differ from actor)
  outcome?:      AuditOutcome                 // default: 'success'
  error_message?: string | null               // short human-readable failure reason
  status_code?:  number | null                // HTTP status code, when known at call site
  metadata?:     Record<string, any> | null   // extra structured context (no secrets!)
}

/**
 * Record an audit event tied to a request. Never throws.
 *
 *   audit(req, { action: 'login', resource: 'user', subject_email: user.email })
 */
export async function audit(req: any, params: AuditParams): Promise<void> {
  try {
    const actor_id    = req?.user?.id    ?? null
    const actor_email = req?.user?.email ?? null
    const actor_role  = req?.user?.role  ?? null

    const ip =
      ((req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim())
      || req?.ip
      || null
    const user_agent = (req?.headers?.['user-agent'] as string) ?? null
    const method     = req?.method ?? null
    const path       = req?.url    ?? null

    await prisma.auditLog.create({
      data: {
        action:        params.action,
        resource:      params.resource,
        resource_id:   params.resource_id ?? null,
        actor_id,
        actor_email,
        actor_role,
        subject_email: params.subject_email ?? null,
        metadata:      params.metadata ? (params.metadata as any) : undefined,
        ip,
        user_agent,
        method,
        path,
        status_code:   params.status_code ?? null,
        outcome:       params.outcome ?? 'success',
        error_message: params.error_message ?? null,
      },
    })
  } catch (err) {
    console.error('audit log write failed:', (err as any)?.message ?? err)
  }
}

/**
 * Explicit "system" event for background jobs (cron, migration scripts) with no
 * request context. Records the actor as null across the board.
 */
export async function auditSystem(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action:        params.action,
        resource:      params.resource,
        resource_id:   params.resource_id ?? null,
        actor_id:      null,
        actor_email:   'system@globipet',
        actor_role:    'system',
        subject_email: params.subject_email ?? null,
        metadata:      params.metadata ? (params.metadata as any) : undefined,
        ip:            null,
        user_agent:    null,
        method:        null,
        path:          null,
        status_code:   params.status_code ?? null,
        outcome:       params.outcome ?? 'success',
        error_message: params.error_message ?? null,
      },
    })
  } catch (err) {
    console.error('audit system write failed:', (err as any)?.message ?? err)
  }
}
