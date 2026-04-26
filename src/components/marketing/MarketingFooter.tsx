import Link from 'next/link'

export default function MarketingFooter() {
  return (
    <footer className="bg-stone-900 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-stone-400">Choice Marketing Partners</p>
        <div className="flex items-center gap-6">
          <Link
            href="/about-us"
            className="text-sm text-stone-500 transition-colors hover:text-stone-300"
          >
            About Us
          </Link>
          <Link
            href="/blog"
            className="text-sm text-stone-500 transition-colors hover:text-stone-300"
          >
            Blog
          </Link>
          <Link
            href="/careers"
            className="text-sm text-stone-500 transition-colors hover:text-stone-300"
          >
            Careers
          </Link>
          <p className="text-sm text-stone-600">
            &copy; {new Date().getFullYear()} Choice Marketing Partners
          </p>
        </div>
      </div>
    </footer>
  )
}
