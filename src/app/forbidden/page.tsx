'use client'

import Link from 'next/link'
import { Shield, Home, ArrowLeft } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/10 to-destructive/20 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          {/* 403 Visual */}
          <div className="flex justify-center">
            <Shield className="w-20 h-20 text-destructive" />
          </div>
          
          <div className="text-6xl font-bold text-muted-foreground select-none">403</div>
          
          {/* Heading */}
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            Access Forbidden
          </h1>
          
          {/* Description */}
          <p className="text-lg text-muted-foreground">
            You don&apos;t have permission to access this resource. 
            This page is restricted to specific user roles or requires additional authorization.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            <Home className="w-5 h-5 mr-2" />
            Go to Dashboard
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
          <p>If you believe you should have access:</p>
          <ul className="space-y-1">
            <li>• Contact your administrator</li>
            <li>• Verify you&apos;re logged in with the correct account</li>
            <li>• Check if your permissions have changed</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
