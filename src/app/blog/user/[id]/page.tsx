import { BlogRepository } from '@/lib/repositories/blog'
import { db } from '@/lib/database/client'
import { notFound } from 'next/navigation'
import BlogFeed from '@/components/blog/BlogFeed'
import Link from 'next/link'

interface AuthorPageProps {
  params: { id: string }
  searchParams: { page?: string }
}

export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
  const authorId = parseInt(params.id, 10)
  if (isNaN(authorId)) {
    notFound()
  }

  const page = parseInt(searchParams.page || '1', 10)
  const blogRepo = new BlogRepository()

  // Get author info
  const authorResult = await db
    .selectFrom('users')
    .select(['id', 'name', 'email'])
    .where('id', '=', authorId)
    .execute()

  if (authorResult.length === 0) {
    notFound()
  }

  const author = authorResult[0]

  // Get author's posts
  const { posts, totalPages, currentPage, total } = await blogRepo.getPostsByAuthor(authorId, page, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Back to blog link */}
          <div className="mb-8">
            <Link 
              href="/blog"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Blog
            </Link>
          </div>

          {/* Author header */}
          <header className="mb-8 pb-8 border-b border-gray-200 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {author.name}
            </h1>
            <p className="text-gray-600">
              {total} {total === 1 ? 'post' : 'posts'} published
            </p>
          </header>

          {/* Author's posts */}
          {posts.length > 0 ? (
            <>
              <BlogFeed posts={posts} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12 space-x-2">
                  {page > 1 && (
                    <Link
                      href={`/blog/user/${authorId}?page=${page - 1}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  
                  <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  {page < totalPages && (
                    <Link
                      href={`/blog/user/${authorId}?page=${page + 1}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                This author hasn&apos;t published any posts yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: AuthorPageProps) {
  const authorId = parseInt(params.id, 10)
  if (isNaN(authorId)) {
    return {
      title: 'Author Not Found',
    }
  }

  const authorResult = await db
    .selectFrom('users')
    .select(['name'])
    .where('id', '=', authorId)
    .execute()

  if (authorResult.length === 0) {
    return {
      title: 'Author Not Found',
    }
  }

  const author = authorResult[0]

  return {
    title: `Posts by ${author.name} - Choice Marketing Partners Blog`,
    description: `Read all blog posts by ${author.name} on the Choice Marketing Partners blog.`,
  }
}
