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
        <p className="text-muted-foreground">No blog posts available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.id} className="border-b border-border last:border-b-0 pb-6 last:pb-0">
          <div className="mb-3">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-primary transition-colors"
              >
                {post.title}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(post.created_at)} By{' '}
              {post.author ? (
                <Link
                  href={`/blog/user/${post.author.id}`}
                  className="text-primary hover:text-primary/80"
                >
                  {post.author.name}
                </Link>
              ) : (
                'Unknown Author'
              )}
            </p>
          </div>
          
          <div className="text-foreground">
            <div
              dangerouslySetInnerHTML={{
                __html: truncateText(post.body, 500) + (post.body.length > 500 ? `... <a href="/blog/${post.slug}" class="text-primary hover:text-primary/80">[Read More]</a>` : '')
              }}
            />
          </div>
        </article>
      ))}
    </div>
  )
}
