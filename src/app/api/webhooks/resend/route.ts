import { NextResponse } from 'next/server'
import { verifyResendWebhook } from '@/lib/services/resend-webhook'
import { EmailDeliveryRepository } from '@/lib/repositories/EmailDeliveryRepository'
import { logger } from '@/lib/utils/logger'

/** Resend event types we persist; others are acknowledged but ignored. */
const TRACKED_EVENTS = new Set([
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.complained',
])

/**
 * POST /api/webhooks/resend — receives Resend (Svix-signed) delivery webhooks
 * and records bounce/delivery events so undeliverable employee emails surface.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      logger.error('Resend webhook: missing Svix signature headers')
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 })
    }

    let event
    try {
      event = verifyResendWebhook(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      })
    } catch (err) {
      logger.error('Resend webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    logger.info(`Resend webhook received: ${event.type}`)

    if (TRACKED_EVENTS.has(event.type)) {
      const repo = new EmailDeliveryRepository()
      const recipients = Array.isArray(event.data?.to)
        ? event.data.to
        : event.data?.to
          ? [event.data.to]
          : []
      const occurredAt = event.created_at ? new Date(event.created_at) : null

      for (const email of recipients) {
        await repo.recordEvent({
          // Svix delivers at-least-once; the unique svix_id makes inserts
          // idempotent. Multi-recipient events get a per-recipient suffix.
          svixId: recipients.length > 1 ? `${svixId}:${email}` : svixId,
          email,
          eventType: event.type,
          resendEmailId: event.data?.email_id ?? null,
          subject: event.data?.subject ?? null,
          bounceType: event.data?.bounce?.type ?? null,
          occurredAt,
          payload: event,
        })
      }
    } else {
      logger.info(`Resend webhook: unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Resend webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
