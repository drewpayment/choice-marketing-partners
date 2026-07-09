import { redirect } from 'next/navigation'

// The Comma Club content lives in a modal on the landing page (no dedicated
// anchor section), so this public route simply redirects home where it can be
// opened.
export default function CommaClubPage() {
  redirect('/')
}
