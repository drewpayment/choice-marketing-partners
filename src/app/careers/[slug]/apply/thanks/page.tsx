import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Application received | Choice Marketing Partners',
  robots: { index: false },
}

export default async function ApplyThanksPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-primary">
            Choice Marketing Partners
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <CheckCircle2 className="mx-auto size-16 text-primary" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Thanks — we got it.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Your application is in. Our team reviews every submission and will reach
          out within a few business days. Keep an eye on the email you provided.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="outline">
            <Link href={`/careers/${slug}`}>Back to role</Link>
          </Button>
          <Button asChild size="lg" className="bg-amber-600 text-white hover:bg-amber-700">
            <Link href="/careers">See other roles</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
