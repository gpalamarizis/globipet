import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star, Bone, Gamepad2, Tag, HeartPulse, Scissors, GraduationCap, Home, Package } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Props { product: Product; viewMode?: 'grid' | 'list' }

// #6: illustration fallback per product category (instead of one generic 📦 emoji)
const categoryIllustration: Record<string, { Icon: typeof Bone, bg: string, fg: string }> = {
  food:        { Icon: Bone,          bg: 'bg-amber-50 dark:bg-amber-900/15',   fg: 'text-amber-400 dark:text-amber-500' },
  toys:        { Icon: Gamepad2,      bg: 'bg-blue-50 dark:bg-blue-900/15',     fg: 'text-blue-400 dark:text-blue-500' },
  accessories: { Icon: Tag,           bg: 'bg-pink-50 dark:bg-pink-900/15',     fg: 'text-pink-400 dark:text-pink-500' },
  health:      { Icon: HeartPulse,    bg: 'bg-red-50 dark:bg-red-900/15',       fg: 'text-red-400 dark:text-red-500' },
  grooming:    { Icon: Scissors,      bg: 'bg-purple-50 dark:bg-purple-900/15', fg: 'text-purple-400 dark:text-purple-500' },
  training:    { Icon: GraduationCap, bg: 'bg-green-50 dark:bg-green-900/15',   fg: 'text-green-400 dark:text-green-500' },
  housing:     { Icon: Home,          bg: 'bg-orange-50 dark:bg-orange-900/15', fg: 'text-orange-400 dark:text-orange-500' },
}
const defaultIllustration = { Icon: Package, bg: 'bg-gray-50 dark:bg-gray-800', fg: 'text-gray-300 dark:text-gray-600' }

export default function ProductCard({ product, viewMode = 'grid' }: Props) {
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const illustration = categoryIllustration[product.category] || defaultIllustration
  const { Icon: CategoryIcon, bg: illuBg, fg: illuFg } = illustration

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
            {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/> : <div className={cn('w-full h-full flex items-center justify-center', illuBg)}><CategoryIcon size={26} className={illuFg} strokeWidth={1.5} /></div>}
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
          {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/> : <div className={cn('w-full h-full flex items-center justify-center', illuBg)}><CategoryIcon size={40} className={illuFg} strokeWidth={1.5} /></div>}
        </div>
        {product.discount_percentage && <div className="absolute top-2 left-2 badge bg-red-500 text-white">-{product.discount_percentage}%</div>}
        {product.is_featured && <div className="absolute top-2 right-2 badge bg-brand-900 text-white">⭐</div>}
      </Link>

      <div className="p-2">
        <Link to={`/marketplace/${product.id}`}>
          <p className="font-medium text-xs text-gray-900 dark:text-white hover:text-brand-900 line-clamp-2 leading-snug">{product.name}</p>
        </Link>
        {product.brand && <p className="text-[10px] text-gray-400 mt-0.5">{product.brand}</p>}
        <div className="flex items-center gap-0.5 mt-1">
          <Star size={9} className="text-yellow-400 fill-yellow-400"/>
          <span className="text-[10px] text-gray-500">{product.rating} ({product.reviews_count})</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="font-bold text-xs text-gray-900 dark:text-white">{formatCurrency(product.sale_price || product.price)}</p>
            {product.sale_price && <p className="text-[10px] text-gray-400 line-through">{formatCurrency(product.price)}</p>}
          </div>
          <div className="flex gap-1">
            {isAuthenticated && (
              <button onClick={() => toggleWishlist.mutate()} className={cn('p-1.5 rounded-lg transition-colors', inWishlist ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <Heart size={13} fill={inWishlist ? 'currentColor' : 'none'}/>
              </button>
            )}
            <button onClick={() => isAuthenticated ? addToCart.mutate() : null} disabled={addToCart.isPending || product.stock === 0} className="p-1.5 rounded-lg bg-brand-900 text-white hover:bg-brand-800 transition-colors disabled:opacity-50">
              <ShoppingCart size={13}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
