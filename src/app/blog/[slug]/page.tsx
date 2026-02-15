import { BlogRepository } from '@/lib/repositories/blog'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/date'

interface BlogPostPageProps {
  params: { slug: string }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const blogRepo = new BlogRepository()
  const post = await blogRepo.getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg shadow-lg p-8">
          {/* Back to blog link */}
          <div className="mb-8">
            <Link 
              href="/blog"
              className="text-primary hover:text-primary/80 font-medium"
            >
              ← Back to Blog
            </Link>
          </div>

          {/* Post header */}
          <header className="mb-8 pb-8 border-b border-border">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {post.title}
            </h1>
            <div className="flex items-center text-muted-foreground">
              <time dateTime={post.created_at?.toISOString()}>
                {formatDate(post.created_at)}
              </time>
              {post.author && (
                <>
                  <span className="mx-2">•</span>
                  <span>By </span>
                  <Link 
                    href={`/blog/user/${post.author.id}`}
                    className="text-primary hover:text-primary/80 ml-1"
                  >
                    {post.author.name}
                  </Link>
                </>
              )}
            </div>
          </header>

          {/* Post content */}
          <article className="prose prose-lg max-w-none text-foreground">
            <div dangerouslySetInnerHTML={{ __html: post.body }} />
          </article>

          {/* Post footer */}
          <footer className="mt-12 pt-8 border-t border-border">
            <div className="flex justify-between items-center">
              <Link 
                href="/blog"
                className="text-primary hover:text-primary/80 font-medium"
              >
                ← Back to Blog
              </Link>
              
              {post.author && (
                <Link 
                  href={`/blog/user/${post.author.id}`}
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  More posts by {post.author.name} →
                </Link>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps) {
  const blogRepo = new BlogRepository()
  const post = await blogRepo.getPostBySlug(params.slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.title,
    description: post.body.substring(0, 160).replace(/<[^>]*>/g, ''),
  }
}
