import { Webhook } from 'svix'

/**
 * Shape of a Resend webhook event payload (subset we use).
 * See https://resend.com/docs/dashboard/webhooks/event-types
 */
export interface ResendWebhookEvent {
  type: string
  created_at?: string
  data: {
    email_id?: string
    to?: string[] | string
    subject?: string
    bounce?: { type?: string; subType?: string }
  }
}

export interface SvixHeaders {
  'svix-id': string
  'svix-timestamp': string
  'svix-signature': string
}

/**
 * Verify a Resend webhook request. Resend signs webhooks with Svix; the
 * signature is verified against RESEND_WEBHOOK_SECRET (a `whsec_...` value).
 * Throws if the signature is invalid or the secret is not configured.
 */
export function verifyResendWebhook(rawBody: string, headers: SvixHeaders): ResendWebhookEvent {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('RESEND_WEBHOOK_SECRET is not configured')
  }
  const wh = new Webhook(secret)
  return wh.verify(rawBody, headers) as ResendWebhookEvent
}
