import { db } from '@/lib/database/client'

export interface TestimonialData {
  id: number
  content: string
  location: string
  testimonial_type: number
  created_at: Date | null
  updated_at: Date | null
}

export class TestimonialRepository {
  /**
   * Get customer testimonials (type 1)
   */
  async getCustomerTestimonials(): Promise<TestimonialData[]> {
    return await db
      .selectFrom('testimonials')
      .selectAll()
      .where('testimonial_type', '=', 1)
      .execute()
  }

  /**
   * Get agent testimonials (type 2)
   */
  async getAgentTestimonials(): Promise<TestimonialData[]> {
    return await db
      .selectFrom('testimonials')
      .selectAll()
      .where('testimonial_type', '=', 2)
      .execute()
  }
}
