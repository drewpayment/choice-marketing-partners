import { db } from '@/lib/database/client'

/**
 * Resend webhook event types we record. `email.bounced` and `email.complained`
 * mark an address as undeliverable; the others are informational.
 */
export type EmailDeliveryEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.bounced'
  | 'email.complained'

/** Event types that mean the address could not receive mail. */
export const UNDELIVERABLE_EVENT_TYPES = ['email.bounced', 'email.complained'] as const

export interface RecordDeliveryEventInput {
  svixId: string
  email: string
  eventType: string
  resendEmailId?: string | null
  subject?: string | null
  bounceType?: string | null
  occurredAt?: Date | null
  payload?: unknown
}

export interface EmailDeliveryStatus {
  email: string
  eventType: string
  bounceType: string | null
  subject: string | null
  occurredAt: Date | null
  createdAt: Date
}

export interface UndeliverableEmployee {
  employeeId: number
  employeeName: string
  email: string
  eventType: string
  bounceType: string | null
  subject: string | null
  occurredAt: Date | null
}

/**
 * Append-only log of Resend email delivery webhook events.
 * Delivery status is correlated to employees/users by recipient email address.
 */
export class EmailDeliveryRepository {
  /**
   * Record a webhook event. Idempotent: a repeated `svixId` (Svix delivers
   * at-least-once) is ignored via INSERT IGNORE on the unique key.
   */
  async recordEvent(input: RecordDeliveryEventInput): Promise<void> {
    await db
      .insertInto('email_delivery_events')
      .ignore()
      .values({
        svix_id: input.svixId,
        email: input.email.trim().toLowerCase(),
        event_type: input.eventType,
        resend_email_id: input.resendEmailId ?? null,
        subject: input.subject ?? null,
        bounce_type: input.bounceType ?? null,
        occurred_at: input.occurredAt ?? null,
        payload: input.payload !== undefined ? JSON.stringify(input.payload) : null,
      })
      .execute()
  }

  /** Most recent delivery event for a single email address, or null if none. */
  async getLatestStatusForEmail(email: string): Promise<EmailDeliveryStatus | null> {
    const row = await db
      .selectFrom('email_delivery_events')
      .select(['email', 'event_type', 'bounce_type', 'subject', 'occurred_at', 'created_at'])
      .where('email', '=', email.trim().toLowerCase())
      .orderBy('occurred_at', 'desc')
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (!row) return null
    return {
      email: row.email,
      eventType: row.event_type,
      bounceType: row.bounce_type,
      subject: row.subject,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
    }
  }

  /** Latest delivery event for many addresses at once, keyed by lowercased email. */
  async getLatestStatusForEmails(emails: string[]): Promise<Map<string, EmailDeliveryStatus>> {
    const result = new Map<string, EmailDeliveryStatus>()
    const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()))].filter(Boolean)
    if (normalized.length === 0) return result

    const rows = await db
      .selectFrom('email_delivery_events as ede')
      .innerJoin(
        (eb) =>
          eb
            .selectFrom('email_delivery_events')
            .select('email')
            .select((e) => e.fn.max('id').as('max_id'))
            .where('email', 'in', normalized)
            .groupBy('email')
            .as('latest'),
        (join) => join.onRef('latest.max_id', '=', 'ede.id')
      )
      .select(['ede.email', 'ede.event_type', 'ede.bounce_type', 'ede.subject', 'ede.occurred_at', 'ede.created_at'])
      .execute()

    for (const row of rows) {
      result.set(row.email, {
        email: row.email,
        eventType: row.event_type,
        bounceType: row.bounce_type,
        subject: row.subject,
        occurredAt: row.occurred_at,
        createdAt: row.created_at,
      })
    }
    return result
  }

  /**
   * Active employees whose most recent email delivery event marks the address
   * as undeliverable (bounced or complained).
   */
  async listUndeliverable(): Promise<UndeliverableEmployee[]> {
    const rows = await db
      .selectFrom('email_delivery_events as ede')
      .innerJoin(
        (eb) =>
          eb
            .selectFrom('email_delivery_events')
            .select('email')
            .select((e) => e.fn.max('id').as('max_id'))
            .groupBy('email')
            .as('latest'),
        (join) => join.onRef('latest.max_id', '=', 'ede.id')
      )
      .innerJoin('employees', 'employees.email', 'ede.email')
      .where('ede.event_type', 'in', [...UNDELIVERABLE_EVENT_TYPES])
      .where('employees.deleted_at', 'is', null)
      .select([
        'employees.id as employee_id',
        'employees.name as employee_name',
        'ede.email',
        'ede.event_type',
        'ede.bounce_type',
        'ede.subject',
        'ede.occurred_at',
      ])
      .orderBy('ede.occurred_at', 'desc')
      .execute()

    return rows.map((r) => ({
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      email: r.email,
      eventType: r.event_type,
      bounceType: r.bounce_type,
      subject: r.subject,
      occurredAt: r.occurred_at,
    }))
  }
}
