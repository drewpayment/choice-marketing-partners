import { TestimonialData } from '@/lib/repositories/testimonials'

interface TestimonialSectionProps {
  title: string
  testimonials: TestimonialData[]
  id: string
}

export default function TestimonialSection({ title, testimonials, id }: TestimonialSectionProps) {
  return (
    <section id={id}>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-2xl font-bold text-center">{title}</h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {testimonials.map((testimonial, index) => (
              <div key={testimonial.id} className="bg-gray-50 rounded-lg p-4">
                <blockquote className={index % 2 === 0 ? "text-left" : "text-right"}>
                  <p className="text-gray-700 italic mb-2">&ldquo;{testimonial.content}&rdquo;</p>
                  <footer className="text-sm text-gray-500">— {testimonial.location}</footer>
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
