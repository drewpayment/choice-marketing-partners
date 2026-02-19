import { requireSubscriber } from '@/lib/auth/utils'

export default async function SubscriberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSubscriber()

  return <>{children}</>
}
