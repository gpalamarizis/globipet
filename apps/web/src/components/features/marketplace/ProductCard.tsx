import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Props { product: Product; viewMode?: 'grid' | 'list' }

export default function ProductCard({ product, viewMode = 'grid' }: Props) {
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: wishlist = [] } = useQuery({ queryKey: ['wishlist', user?.email], queryFn: () => api.get('/wishlist').then(r=>r.data?.data??[]), enabled: !!user })
  const inWishlist = wishlist.some((w: any) => w.product_id === product.id)

  const addToCart = useMutation({
    mutationFn: () => api.post('/cart', { product_id: product.id, product_name: product.name, product_price: product.price, product_image: product.image_url, quantity: 1 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cart'] }); toast.success('Προστέθηκε στο καλάθι!') }
  })

  const toggleWishlist = useMutation({
    mutationFn: () => inWishlist ? api.delete(`/wishlist/${product.id}`) : api.post('/wishlist', { product_id: product.id, product_name: product.name, product_price: product.price, product_image: product.image_url }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] })
  })

  if (viewMode === 'list') {
    return (
      <div className="card p-4 flex gap-4 hover:shadow-card-hover transition-all">
        <Link to={`/marketplace/${product.id}`} className="shrink-0">
          <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/marketplace/${product.id}`}><p className="font-semibold text-gray-900 dark:text-white hover:text-brand-900 truncate">{product.name}</p></Link>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{product.brand}</p>
          <div className="flex items-center gap-1 mt-1"><Star size={12} className="text-yellow-400 fill-yellow-400"/><span className="text-xs text-gray-500">{product.rating}</span></div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <p className="font-bold text-brand-900">{formatCurrency(product.sale_price || product.price)}</p>
          {product.sale_price && <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</p>}
          <button onClick={() => isAuthenticated ? addToCart.mutate() : null} disabled={addToCart.isPending} className="btn-primary py-1.5 text-xs flex items-center gap-1"><ShoppingCart size={13}/>Καλάθι</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden group hover:shadow-card-hover transition-all duration-200">
      <Link to={`/marketplace/${product.id}`} className="block relative">
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/> : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
        </div>
        {product.discount_percentage && <div className="absolute top-2 left-2 badge bg-red-500 text-white">-{product.discount_percentage}%</div>}
        {product.is_featured && <div className="absolute top-2 right-2 badge bg-brand-900 text-white">⭐</div>}
      </Link>

      <div className="p-3">
        <Link to={`/marketplace/${product.id}`}>
          <p className="font-semibold text-sm text-gray-900 dark:text-white hover:text-brand-900 line-clamp-2 leading-snug">{product.name}</p>
        </Link>
        {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
        <div className="flex items-center gap-1 mt-1">
          <Star size={11} className="text-yellow-400 fill-yellow-400"/>
          <span className="text-xs text-gray-500">{product.rating} ({product.reviews_count})</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(product.sale_price || product.price)}</p>
            {product.sale_price && <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</p>}
          </div>
          <div className="flex gap-1">
            {isAuthenticated && (
              <button onClick={() => toggleWishlist.mutate()} className={cn('p-2 rounded-lg transition-colors', inWishlist ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <Heart size={15} fill={inWishlist ? 'currentColor' : 'none'}/>
              </button>
            )}
            <button onClick={() => isAuthenticated ? addToCart.mutate() : null} disabled={addToCart.isPending || product.stock === 0} className="p-2 rounded-lg bg-brand-900 text-white hover:bg-brand-800 transition-colors disabled:opacity-50">
              <ShoppingCart size={15}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
