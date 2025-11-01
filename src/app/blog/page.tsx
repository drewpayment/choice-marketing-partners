import { BlogRepository } from '@/lib/repositories/blog'
import BlogFeed from '@/components/blog/BlogFeed'
import { Suspense } from 'react'

interface BlogPageProps {
  searchParams: { page?: string }
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const page = parseInt(searchParams.page || '1', 10)
  const blogRepo = new BlogRepository()
  const { posts, totalPages, currentPage } = await blogRepo.getLatestPosts(page, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            Choice Marketing Partners Blog
          </h1>
          
          <Suspense fallback={<div className="text-center py-8">Loading posts...</div>}>
            <BlogFeed posts={posts} />
          </Suspense>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-12 space-x-2">
              {page > 1 && (
                <a
                  href={`/blog?page=${page - 1}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Previous
                </a>
              )}
              
              <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded">
                Page {currentPage} of {totalPages}
              </span>
              
              {page < totalPages && (
                <a
                  href={`/blog?page=${page + 1}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
