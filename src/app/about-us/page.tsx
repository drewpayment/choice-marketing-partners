export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            About Choice Marketing Partners
          </h1>
          
          <div className="prose prose-lg text-gray-700 leading-relaxed space-y-6">
            <p>
              Choice Marketing Partners has been a leader in the energy marketing industry for over a decade. 
              We specialize in connecting customers with the best energy solutions while providing our agents 
              with unmatched earning opportunities and support.
            </p>
            
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Our Mission</h2>
            <p>
              To provide exceptional energy solutions to customers while creating wealth-building opportunities 
              for our independent contractors. We believe in transparency, integrity, and putting people first.
            </p>
            
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Why Choose Us?</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Industry-leading commission structures</li>
              <li>Comprehensive training and ongoing support</li>
              <li>Flexible work schedules and territory management</li>
              <li>Regular incentives and contest opportunities</li>
              <li>Strong partnerships with major energy providers</li>
              <li>Proven track record of agent success</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Integrity</h3>
                <p className="text-sm text-blue-700">
                  We conduct business with honesty and transparency in all our relationships.
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Excellence</h3>
                <p className="text-sm text-green-700">
                  We strive for excellence in everything we do, from customer service to agent support.
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Growth</h3>
                <p className="text-sm text-purple-700">
                  We are committed to the personal and professional growth of our team members.
                </p>
              </div>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Get Started Today</h2>
            <p>
              Ready to join our team of successful energy marketing professionals? Contact us today to learn 
              about the opportunities available in your area.
            </p>
            
            <div className="text-center mt-8">
              <a 
                href="/contact" 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Contact Us Today
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
