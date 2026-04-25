import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CareersHero({ openCount }: { openCount: number }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-cyan-700 via-cyan-800 to-cyan-950 py-24 text-white sm:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-600/20 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-cyan-100 backdrop-blur-sm">
            <Sparkles className="size-4" />
            {openCount > 0
              ? `${openCount} open ${openCount === 1 ? 'role' : 'roles'} right now`
              : 'Join the team'}
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Build <span className="text-amber-400">your career</span> with us.
          </h1>
          <p className="mb-10 text-lg text-cyan-100 sm:text-xl">
            Choice Marketing Partners is a team of operators, sellers, and builders who
            move fast, win together, and share in the upside. Browse open roles below.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-amber-600 text-white shadow-lg hover:bg-amber-700"
            >
              <a href="#open-roles">
                View Open Roles
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/about-us">About Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
