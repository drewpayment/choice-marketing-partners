import { Badge } from '@/components/ui/badge'
import { Mail, MailCheck, MailWarning, MailX } from 'lucide-react'
import type { EmailDeliveryStatus } from '@/lib/repositories/EmailDeliveryRepository'

/**
 * Presentational badge summarizing the most recent email delivery event for an
 * address. Renders nothing for benign "sent" state to avoid badge noise; shows
 * a clear warning when mail bounced or was marked as spam.
 */
export function EmailDeliveryBadge({ status }: { status: EmailDeliveryStatus | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-xs">
        <Mail className="mr-1 h-3 w-3" />
        No delivery data
      </Badge>
    )
  }

  switch (status.eventType) {
    case 'email.bounced':
      return (
        <Badge variant="destructive" className="text-xs">
          <MailX className="mr-1 h-3 w-3" />
          Email bounced
        </Badge>
      )
    case 'email.complained':
      return (
        <Badge variant="destructive" className="text-xs">
          <MailX className="mr-1 h-3 w-3" />
          Marked as spam
        </Badge>
      )
    case 'email.delivery_delayed':
      return (
        <Badge variant="secondary" className="text-xs">
          <MailWarning className="mr-1 h-3 w-3" />
          Delivery delayed
        </Badge>
      )
    case 'email.delivered':
      return (
        <Badge variant="default" className="text-xs">
          <MailCheck className="mr-1 h-3 w-3" />
          Email delivered
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs">
          <Mail className="mr-1 h-3 w-3" />
          Email sent
        </Badge>
      )
  }
}
