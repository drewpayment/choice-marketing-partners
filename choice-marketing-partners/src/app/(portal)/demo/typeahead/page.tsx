import { redirect } from 'next/navigation'
import TypeaheadSelectDemo from '@/components/demo/TypeaheadSelectDemo'

export default function DemoPage() {
  // Redirect to home page in production
  if (process.env.NODE_ENV === 'production') {
    redirect('/')
  }
  
  return <TypeaheadSelectDemo />
}