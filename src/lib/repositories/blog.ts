import { db } from '@/lib/database/client'
import { sql } from 'kysely'

export interface BlogPostData {
  id: number
  title: string
  slug: string
  body: string
  active: number
  author_id: number
  created_at: Date | null
  updated_at: Date | null
  author?: {
    id: number
    name: string
    email: string
  }
}

export interface PaginatedPosts {
  posts: BlogPostData[]
  total: number
  currentPage: number
  perPage: number
  totalPages: number
}

export class BlogRepository {
  /**
   * Get latest active blog posts with pagination
   */
  async getLatestPosts(page: number = 1, perPage: number = 5): Promise<PaginatedPosts> {
    const offset = (page - 1) * perPage

    // Get total count
    const totalResult = await db
      .selectFrom('posts')
      .select(['id'])
      .where('active', '=', 1)
      .execute()
    
    const total = totalResult.length

    // Get paginated posts with author
    const posts = await db
      .selectFrom('posts')
      .leftJoin('users', 'posts.author_id', 'users.id')
      .select([
        'posts.id',
        'posts.title', 
        'posts.slug',
        'posts.body',
        'posts.active',
        'posts.author_id',
        'posts.created_at',
        'posts.updated_at',
        'users.name as author_name',
        'users.email as author_email'
      ])
      .where('posts.active', '=', 1)
      // `posts.created_at` is nullable; MySQL DESC puts NULLs last, Postgres DESC
      // puts them first by default — pin `nulls last` to preserve today's ordering.
      .orderBy('posts.created_at', (ob) => ob.desc().nullsLast())
      .limit(perPage)
      .offset(offset)
      .execute()

    const postsWithAuthor: BlogPostData[] = posts.map(post => ({
      id: post.id!,
      title: post.title,
      slug: post.slug,
      body: post.body,
      active: post.active,
      author_id: post.author_id,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: post.author_name ? {
        id: post.author_id,
        name: post.author_name,
        email: post.author_email || ''
      } : undefined
    }))

    return {
      posts: postsWithAuthor,
      total,
      currentPage: page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  }

  /**
   * Get a single post by slug
   */
  async getPostBySlug(slug: string): Promise<BlogPostData | null> {
    const posts = await db
      .selectFrom('posts')
      .leftJoin('users', 'posts.author_id', 'users.id')
      .select([
        'posts.id',
        'posts.title', 
        'posts.slug',
        'posts.body',
        'posts.active',
        'posts.author_id',
        'posts.created_at',
        'posts.updated_at',
        'users.name as author_name',
        'users.email as author_email'
      ])
      // `posts.slug` was matched case- AND accent-insensitively under MySQL
      // (`utf8mb3_unicode_ci`); Postgres `=` on text is exact. Slugs stored
      // today are all canonical lowercase, but the *requested* URL is not
      // controlled by us — an emailed or indexed `/blog/September-Bonus`
      // resolved before the migration and would 404 after it. Compare on
      // `lower()` on both sides to keep those links alive.
      // The table is small (tens of rows) so the seq scan this forces is free;
      // if `posts` ever grows, add `CREATE INDEX ON posts (lower(slug))`.
      .where(sql`lower(posts.slug)`, '=', slug.toLowerCase())
      .where('posts.active', '=', 1)
      .execute()

    if (posts.length === 0) return null

    const post = posts[0]
    return {
      id: post.id!,
      title: post.title,
      slug: post.slug,
      body: post.body,
      active: post.active,
      author_id: post.author_id,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: post.author_name ? {
        id: post.author_id,
        name: post.author_name,
        email: post.author_email || ''
      } : undefined
    }
  }

  /**
   * Get posts by author
   */
  async getPostsByAuthor(authorId: number, page: number = 1, perPage: number = 10): Promise<PaginatedPosts> {
    const offset = (page - 1) * perPage

    // Get total count
    const totalResult = await db
      .selectFrom('posts')
      .select(['id'])
      .where('active', '=', 1)
      .where('author_id', '=', authorId)
      .execute()
    
    const total = totalResult.length

    // Get paginated posts
    const posts = await db
      .selectFrom('posts')
      .leftJoin('users', 'posts.author_id', 'users.id')
      .select([
        'posts.id',
        'posts.title', 
        'posts.slug',
        'posts.body',
        'posts.active',
        'posts.author_id',
        'posts.created_at',
        'posts.updated_at',
        'users.name as author_name',
        'users.email as author_email'
      ])
      .where('posts.active', '=', 1)
      .where('posts.author_id', '=', authorId)
      // `posts.created_at` is nullable; MySQL DESC puts NULLs last, Postgres DESC
      // puts them first by default — pin `nulls last` to preserve today's ordering.
      .orderBy('posts.created_at', (ob) => ob.desc().nullsLast())
      .limit(perPage)
      .offset(offset)
      .execute()

    const postsWithAuthor: BlogPostData[] = posts.map(post => ({
      id: post.id!,
      title: post.title,
      slug: post.slug,
      body: post.body,
      active: post.active,
      author_id: post.author_id,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: post.author_name ? {
        id: post.author_id,
        name: post.author_name,
        email: post.author_email || ''
      } : undefined
    }))

    return {
      posts: postsWithAuthor,
      total,
      currentPage: page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  }
}
