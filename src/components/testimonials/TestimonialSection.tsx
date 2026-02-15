import { TestimonialData } from '@/lib/repositories/testimonials'

interface TestimonialSectionProps {
  title: string
  testimonials: TestimonialData[]
  id: string
}

export default function TestimonialSection({ title, testimonials, id }: TestimonialSectionProps) {
  return (
    <section id={id}>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="bg-primary px-6 py-4">
          <h2 className="text-center text-xl font-bold text-primary-foreground">{title}</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {testimonials.map((testimonial, index) => (
              <div key={testimonial.id} className="rounded-lg bg-muted p-4">
                <blockquote className={index % 2 === 0 ? 'text-left' : 'text-right'}>
                  <p className="mb-2 text-sm italic text-muted-foreground">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <footer className="text-xs text-muted-foreground/70">
                    &mdash; {testimonial.location}
                  </footer>
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
