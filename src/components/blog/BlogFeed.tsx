import { BlogPostData } from '@/lib/repositories/blog'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/date'

interface BlogFeedProps {
  posts: BlogPostData[]
}

function truncateText(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export default function BlogFeed({ posts }: BlogFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No blog posts available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.id} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
          <div className="mb-3">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              <Link 
                href={`/blog/${post.slug}`}
                className="hover:text-blue-600 transition-colors"
              >
                {post.title}
              </Link>
            </h3>
            <p className="text-sm text-gray-600">
              {formatDate(post.created_at)} By{' '}
              {post.author ? (
                <Link 
                  href={`/blog/user/${post.author.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {post.author.name}
                </Link>
              ) : (
                'Unknown Author'
              )}
            </p>
          </div>
          
          <div className="text-gray-700">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: truncateText(post.body, 500) + (post.body.length > 500 ? `... <a href="/blog/${post.slug}" class="text-blue-600 hover:text-blue-800">[Read More]</a>` : '')
              }} 
            />
          </div>
        </article>
      ))}
    </div>
  )
}
