import { TestimonialRepository } from '@/lib/repositories/testimonials'
import { BlogRepository } from '@/lib/repositories/blog'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import CommaClubModal from '@/components/comma-club/CommaClubModal'
import TestimonialSection from '@/components/testimonials/TestimonialSection'
import BlogFeed from '@/components/blog/BlogFeed'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  FileText,
  FolderOpen,
  Users,
  ArrowRight,
  Sparkles,
  Trophy,
  Gift,
} from 'lucide-react'

export default async function HomePage() {
  const [testimonialRepo, blogRepo] = [new TestimonialRepository(), new BlogRepository()]
  const session = await getServerSession(authOptions)

  const [customers, agents, latestPosts] = await Promise.all([
    testimonialRepo.getCustomerTestimonials(),
    testimonialRepo.getAgentTestimonials(),
    blogRepo.getLatestPosts(1, 5),
  ])

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-primary">
            Choice Marketing Partners
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#incentives" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Incentives
            </a>
            <a href="#agent_testimonials" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Testimonials
            </a>
            <a href="#clients" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Partners
            </a>
          </div>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-700 via-cyan-800 to-cyan-950 py-24 text-white sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-600/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-cyan-100 backdrop-blur-sm">
              <Sparkles className="size-4" />
              Trusted by teams since 2005
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Payroll Management,{' '}
              <span className="text-amber-400">Simplified.</span>
            </h1>
            <p className="mb-10 text-lg text-cyan-100 sm:text-xl">
              Commissions, paystubs, invoices, and documents — all in one place.
              Built for marketing teams that move fast.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-amber-600 text-white shadow-lg hover:bg-amber-700">
                <Link href="/contact">
                  Get Started
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>

          {/* Authenticated: Comma Club + Blog Feed */}
          {session && (
            <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-center text-2xl font-bold">Weekly Comma Club</h2>
                <div className="space-y-2 text-center">
                  {[4000, 3000, 2000, 1000, 500].map((amount) => (
                    <p key={amount}>
                      <CommaClubModal
                        amount={amount}
                        className="text-lg font-semibold text-cyan-200 transition-colors hover:text-white"
                      />
                    </p>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <p className="mb-3 text-sm text-cyan-200">
                    Interested in becoming a part of Choice Marketing Partners?
                  </p>
                  <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    <Link href="/contact">
                      <Users className="mr-2 size-4" />
                      Apply Now
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto rounded-xl bg-white p-6 text-foreground shadow-xl">
                <BlogFeed posts={latestPosts.posts} />
              </div>
            </div>
          )}

          {/* Unauthenticated: Comma Club */}
          {!session && (
            <div className="mx-auto mt-16 max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
              <h2 className="mb-4 text-2xl font-bold">Weekly Comma Club</h2>
              <div className="space-y-2">
                {[4000, 3000, 2000, 1000, 500].map((amount) => (
                  <p key={amount}>
                    <CommaClubModal
                      amount={amount}
                      className="text-lg font-semibold text-cyan-200 transition-colors hover:text-white"
                    />
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Features
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything your team needs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From payroll processing to document management, we&apos;ve got you covered.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2">
            {[
              {
                icon: DollarSign,
                title: 'Payroll & Commissions',
                description: 'Automated commission calculations, paystub generation, and payroll tracking for your entire team.',
                iconBg: 'bg-cyan-50 text-primary',
              },
              {
                icon: FileText,
                title: 'Invoice Management',
                description: 'Create, track, and manage invoices with automatic audit trails and paystub recalculation.',
                iconBg: 'bg-amber-50 text-amber-600',
              },
              {
                icon: FolderOpen,
                title: 'Document Storage',
                description: 'Secure cloud storage for all your team documents with role-based access control and easy sharing.',
                iconBg: 'bg-cyan-50 text-primary',
              },
              {
                icon: Users,
                title: 'Team Management',
                description: 'Manage employees, assign managers, track roles, and handle user permissions — all from one dashboard.',
                iconBg: 'bg-violet-50 text-violet-600',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-lg"
              >
                <div className={`mb-4 inline-flex size-12 items-center justify-center rounded-lg ${feature.iconBg}`}>
                  <feature.icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Incentives Section */}
      <section id="incentives" className="bg-muted py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Why Choose Us
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Agent Incentives
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Beyond normal salaries and commission opportunities, Choice Marketing Partners strives to be one of the most competitive compensatory energy affiliates in the industry. We believe that if we share profits with our people, they will work harder and be more likely to invest themselves in the organization. We regularly award Agents with daily cash incentives, weekly bonus opportunities through exceptional sales and customer service interactions, and big award contests like all-expense paid vacations, cars and even houses!
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: DollarSign, label: 'Commission & Incentives', color: 'text-primary bg-cyan-50' },
                { icon: Gift, label: 'Contest Awards', color: 'text-amber-600 bg-amber-50' },
                { icon: Trophy, label: 'Competitive Comp', color: 'text-violet-600 bg-violet-50' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center rounded-xl bg-card p-6 text-center shadow-sm">
                  <div className={`mb-3 inline-flex size-14 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icon className="size-7" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Testimonials
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              What people are saying
            </h2>
          </div>
          <div className="grid gap-12 lg:grid-cols-2">
            <TestimonialSection
              title="Agents"
              testimonials={agents}
              id="agent_testimonials"
            />
            <TestimonialSection
              title="Customers"
              testimonials={customers}
              id="customer_testimonials"
            />
          </div>
        </div>
      </section>

      {/* Partnerships Section */}
      <section id="clients" className="bg-muted py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Our Network
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Partnerships
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {[
              { name: 'Santanna Energy', url: 'https://santannaenergyservices.com/', logo: '/images/clients/santanna.jpeg' },
              { name: 'Continuum Energy', url: 'https://continuumenergyservices.com/', logo: '/images/clients/continuum.jpg' },
              { name: 'Palmco Energy', url: 'https://palmcoenergy.com/', logo: '/images/clients/palmco.jpeg' },
              { name: 'AT&T', url: 'https://www.att.com/', logo: '/images/clients/att.png' },
              { name: 'Spectrum', url: 'https://www.spectrum.com/', logo: '/images/clients/charter.png' },
              { name: 'DirecTV', url: 'https://www.directv.com/', logo: '/images/clients/directv.png' },
            ].map((client) => (
              <a
                key={client.name}
                href={client.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Image
                  src={client.logo}
                  alt={client.name}
                  width={64}
                  height={64}
                  className="h-12 w-full object-contain transition-transform group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-cyan-900 via-cyan-800 to-cyan-950 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to simplify your payroll?
          </h2>
          <p className="mt-4 text-lg text-cyan-200">
            Join Choice Marketing Partners and take control of your commissions, paystubs, and documents.
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="bg-amber-600 text-white shadow-lg hover:bg-amber-700">
              <Link href="/contact">
                Get Started Today
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-stone-400">
            Choice Marketing Partners
          </p>
          <div className="flex items-center gap-6">
            <Link href="/about-us" className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              About Us
            </Link>
            <Link href="/blog" className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              Blog
            </Link>
            <p className="text-sm text-stone-600">
              &copy; {new Date().getFullYear()} Choice Marketing Partners
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
