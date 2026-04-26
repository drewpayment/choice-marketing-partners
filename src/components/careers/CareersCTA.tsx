import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CareersCTA() {
  return (
    <section className="bg-gradient-to-br from-cyan-900 via-cyan-800 to-cyan-950 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Don&apos;t see the right role?
        </h2>
        <p className="mt-4 text-lg text-cyan-200">
          We&apos;re always interested in talking to driven people. Reach out and
          tell us what you&apos;re great at.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="bg-amber-600 text-white shadow-lg hover:bg-amber-700">
            <Link href="/contact">
              Get in Touch
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
