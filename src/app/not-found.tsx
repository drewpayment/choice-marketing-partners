'use client'

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          {/* 404 Visual */}
          <div className="text-6xl font-bold text-muted-foreground select-none">404</div>
          
          {/* Heading */}
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            Page Not Found
          </h1>
          
          {/* Description */}
          <p className="text-lg text-muted-foreground">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. 
            The page might have been moved, deleted, or the URL was entered incorrectly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            <Home className="w-5 h-5 mr-2" />
            Go to Homepage
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-border text-base font-medium rounded-md text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Need help? Try these options:</p>
          <ul className="space-y-1">
            <li>• Check the URL for typos</li>
            <li>• Return to the homepage and navigate from there</li>
            <li>• Contact support if you believe this is an error</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
