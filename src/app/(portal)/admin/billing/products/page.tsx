import { requireAuth } from '@/lib/auth/server-auth'
import ProductsClient from './products-client'

export default async function ProductsPage() {
  await requireAuth('ADMIN')
  return <ProductsClient />
}
