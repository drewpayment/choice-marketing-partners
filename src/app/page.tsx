import { TestimonialRepository } from '@/lib/repositories/testimonials'
import { BlogRepository } from '@/lib/repositories/blog'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import CommaClubModal from '@/components/comma-club/CommaClubModal'
import TestimonialSection from '@/components/testimonials/TestimonialSection'
import BlogFeed from '@/components/blog/BlogFeed'
import Link from 'next/link'
import Image from 'next/image'

export default async function HomePage() {
  // Get data server-side
  const [testimonialRepo, blogRepo] = [new TestimonialRepository(), new BlogRepository()]
  const session = await getServerSession(authOptions)
  
  const [customers, agents, latestPosts] = await Promise.all([
    testimonialRepo.getCustomerTestimonials(),
    testimonialRepo.getAgentTestimonials(),
    blogRepo.getLatestPosts(1, 5)
  ])

  return (
    <div className="min-h-screen">
      {/* Navigation Drawer (Mobile Hidden) */}
      <div className="hidden lg:block">
        <div className="bg-white/75 border border-gray-200 rounded-lg p-4 mx-4 -mt-16 relative z-10">
          <nav className="flex justify-center space-x-8">
            <a href="#agent_testimonials" className="text-blue-600 hover:text-blue-800 font-medium">
              Agents
            </a>
            <a href="#customer_testimonials" className="text-blue-600 hover:text-blue-800 font-medium">
              Customers
            </a>
            <a href="#incentives" className="text-blue-600 hover:text-blue-800 font-medium">
              Incentives
            </a>
            <a href="#clients" className="text-blue-600 hover:text-blue-800 font-medium">
              Clients
            </a>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Content varies by auth status */}
            {session ? (
              <>
                {/* Authenticated: Show blog feed */}
                <div className="lg:order-2">
                  <div className="bg-white rounded-lg p-6 text-gray-900 max-h-96 overflow-y-auto">
                    <BlogFeed posts={latestPosts.posts} />
                  </div>
                </div>
                
                {/* Comma Club for authenticated users */}
                <div className="lg:order-1 border-l border-blue-300 pl-8">
                  <h2 className="text-3xl font-bold mb-6 text-center">Weekly Comma Club</h2>
                  <div className="text-center space-y-2">
                    {[4000, 3000, 2000, 1000, 500].map((amount) => (
                      <p key={amount} className="mb-2">
                        <CommaClubModal 
                          amount={amount}
                          className="text-xl font-semibold text-blue-200 hover:text-white transition-colors"
                        />
                      </p>
                    ))}
                  </div>
                  
                  <div className="text-center mt-8">
                    <p className="mb-4">
                      Interested in becoming a part of Choice Marketing Partners?
                    </p>
                    <Link 
                      href="/contact" 
                      className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                      Apply Now
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Unauthenticated: Call to action */}
                <div className="text-center lg:text-left">
                  <h1 className="text-5xl font-bold mb-6">
                    Join Our Success Story
                  </h1>
                  <p className="text-xl mb-8 text-blue-100">
                    Become part of Choice Marketing Partners and unlock your potential in the energy sales industry.
                  </p>
                  <Link 
                    href="/contact" 
                    className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-lg"
                  >
                    <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                    </svg>
                    Apply Now
                  </Link>
                </div>
                
                {/* Comma Club for unauthenticated users */}
                <div className="border-l border-blue-300 pl-8">
                  <h2 className="text-3xl font-bold mb-6 text-center">Weekly Comma Club</h2>
                  <div className="text-center space-y-2">
                    {[4000, 3000, 2000, 1000, 500].map((amount) => (
                      <p key={amount} className="mb-2">
                        <CommaClubModal 
                          amount={amount}
                          className="text-xl font-semibold text-blue-200 hover:text-white transition-colors"
                        />
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Agent Incentives Section */}
      <section id="incentives" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Agent Incentives</h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                Beyond normal salaries and commission opportunities, Choice Marketing Partners strives to be one of the most competitive compensatory energy affiliates in the industry. We believe that if we share profits with our people, they will work harder and be more likely to invest themselves in the organization. We regularly award Agents with daily cash incentives, weekly bonus opportunities through exceptional sales and customer service interactions, and big award contests like all-expense paid vacations, cars and even houses!
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-6 bg-white rounded-lg shadow-lg">
                <div className="text-5xl text-blue-600 mb-4">💰</div>
                <p className="font-semibold text-gray-900">Commission & Incentives</p>
              </div>
              <div className="text-center p-6 bg-white rounded-lg shadow-lg">
                <div className="text-5xl text-green-600 mb-4">🎁</div>
                <p className="font-semibold text-gray-900">Contest Awards</p>
              </div>
              <div className="text-center p-6 bg-white rounded-lg shadow-lg">
                <div className="text-5xl text-purple-600 mb-4">🏛️</div>
                <p className="font-semibold text-gray-900">Competitive Comp</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
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
      <section id="clients" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Partnerships</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
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
                className="group bg-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow"
              >
                <Image 
                  src={client.logo} 
                  alt={client.name}
                  width={64}
                  height={64}
                  className="w-full h-16 object-contain group-hover:scale-105 transition-transform"
                />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
