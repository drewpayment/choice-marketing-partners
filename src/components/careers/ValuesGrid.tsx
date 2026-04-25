'use client'

import { motion } from 'framer-motion'
import { Target, Users, TrendingUp, Trophy } from 'lucide-react'

const VALUES = [
  {
    icon: Target,
    title: 'Win the day',
    body:
      'We celebrate effort and outcomes. Daily incentives, weekly contests, and big-ticket awards keep the energy up.',
    accent: 'text-primary bg-cyan-50',
  },
  {
    icon: Users,
    title: 'Team-first',
    body:
      'Managers in the field, operations who pick up the phone, and a culture that promotes from within.',
    accent: 'text-amber-600 bg-amber-50',
  },
  {
    icon: TrendingUp,
    title: 'Real upside',
    body:
      'Competitive base + commission, plus profit-sharing through Comma Club and quarterly bonuses.',
    accent: 'text-violet-600 bg-violet-50',
  },
  {
    icon: Trophy,
    title: 'Big rewards',
    body:
      "All-expense-paid trips, vehicle giveaways, even house contests — we mean it when we say we share the wins.",
    accent: 'text-primary bg-cyan-50',
  },
] as const

export default function ValuesGrid() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Why us
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            What you get when you join
          </h2>
        </div>
        <motion.div
          className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {VALUES.map((value) => (
            <motion.div
              key={value.title}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div
                className={`mb-4 inline-flex size-12 items-center justify-center rounded-lg ${value.accent}`}
              >
                <value.icon className="size-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{value.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{value.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
