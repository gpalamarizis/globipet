import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ShoppingCart, Heart, Star, Shield, Truck, RotateCcw,
  Plus, Minus, Share2, ChevronRight, Package, Check
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Product } from '@/types'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [tab, setTab] = useState<'description' | 'reviews' | 'shipping'>('description')

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: wishlist = [] } = useQuery({
    queryKey: ['wishlist', user?.email],
    queryFn: () => api.get('/wishlist').then(r => r.data?.data ?? []),
    enabled: !!user,
  })
  const inWishlist = wishlist.some((w: any) => w.product_id === product?.id)

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api.get(`/products/${id}/reviews`).then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!id,
  })

  const addToCart = useMutation({
    mutationFn: () => api.post('/cart', {
      product_id: product!.id,
      product_name: product!.name,
      product_price: product!.sale_price || product!.price,
      product_image: product!.image_url,
      quantity,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success(t('cart.added'))
    },
    onError: () => toast.error(t('common.error')),
  })

  const toggleWishlist = useMutation({
    mutationFn: () => inWishlist
      ? api.delete(`/wishlist/${product!.id}`)
      : api.post('/wishlist', {
          product_id: product!.id,
          product_name: product!.name,
          product_price: product!.sale_price || product!.price,
          product_image: product!.image_url,
        }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  })

  if (isLoading) return (
    <div className="page-container py-24 flex justify-center">
      <LoadingSpinner />
    </div>
  )

  if (!product) return (
    <div className="page-container py-16 text-center">
      <Package size={48} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {t('common.noResults')}
      </h2>
      <button onClick={() => navigate('/marketplace')} className="btn-primary mt-4">
        {t('nav.marketplace')}
      </button>
    </div>
  )

  const images = product.image_url ? [product.image_url] : []
  const price = product.sale_price || product.price
  const avgRating = reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : product.rating || 0

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={() => navigate(-1)} className="hover:text-brand-900 flex items-center gap-1">
          <ArrowLeft size={15} /> {t('common.back')}
        </button>
        <ChevronRight size={13} />
        <Link to="/marketplace" className="hover:text-brand-900">{t('nav.marketplace')}</Link>
        <ChevronRight size={13} />
        <span className="text-gray-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Images */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
            {images[selectedImage]
              ? <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
            }
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={cn('w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                    selectedImage === i ? 'border-brand-900' : 'border-transparent')}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          {/* Brand + badges */}
          <div className="flex items-center gap-2">
            {product.brand && <span className="text-sm text-gray-500 font-medium">{product.brand}</span>}
            {product.is_featured && (
              <span className="badge bg-brand-900 text-white text-xs">⭐ Featured</span>
            )}
            {product.discount_percentage && (
              <span className="badge bg-red-500 text-white text-xs">-{product.discount_percentage}%</span>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={16}
                  className={s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {avgRating.toFixed(1)} ({reviews.length || product.reviews_count || 0} {t('common.reviews')})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(price)}
            </span>
            {product.sale_price && (
              <span className="text-lg text-gray-400 line-through">{formatCurrency(product.price)}</span>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            {product.stock > 0 ? (
              <>
                <Check size={16} className="text-green-500" />
                <span className="text-sm text-green-600 font-medium">
                  {product.stock > 10 ? 'In stock' : `Only ${product.stock} left`}
                </span>
              </>
            ) : (
              <span className="text-sm text-red-500 font-medium">Out of stock</span>
            )}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Qty:</span>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-l-xl transition-colors">
                <Minus size={15} />
              </button>
              <span className="px-4 py-2 text-sm font-bold min-w-[40px] text-center">{quantity}</span>
              <button onClick={() => setQuantity(q => Math.min(product.stock || 99, q + 1))}
                className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-r-xl transition-colors">
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => isAuthenticated ? addToCart.mutate() : navigate('/auth')}
              disabled={addToCart.isPending || product.stock === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
            >
              <ShoppingCart size={18} />
              {addToCart.isPending ? t('common.loading') : t('marketplace.addToCart')}
            </button>
            {isAuthenticated && (
              <button onClick={() => toggleWishlist.mutate()}
                className={cn('p-3 rounded-xl border-2 transition-all',
                  inWishlist
                    ? 'border-red-300 bg-red-50 text-red-500 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-red-300')}>
                <Heart size={20} fill={inWishlist ? 'currentColor' : 'none'} />
              </button>
            )}
            <button className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 transition-all">
              <Share2 size={20} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: <Truck size={16} />, text: 'Free shipping €50+' },
              { icon: <Shield size={16} />, text: 'Secure payment' },
              { icon: <RotateCcw size={16} />, text: '30-day returns' },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
                <span className="text-brand-900">{b.icon}</span>
                <span className="text-xs text-gray-500">{b.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          {(['description', 'reviews', 'shipping'] as const).map(t_ => (
            <button key={t_} onClick={() => setTab(t_)}
              className={cn('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                tab === t_
                  ? 'border-brand-900 text-brand-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t_ === 'description' ? t('common.filter') === 'Filter' ? 'Description' : 'Περιγραφή'
               : t_ === 'reviews' ? t('common.reviews')
               : 'Shipping'}
            </button>
          ))}
        </div>

        {tab === 'description' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {product.description || 'No description available for this product.'}
            </p>
            {product.weight && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Weight', value: `${product.weight}g` },
                  { label: 'Category', value: product.category },
                  product.brand && { label: 'Brand', value: product.brand },
                ].filter(Boolean).map((attr: any, i) => (
                  <div key={i} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                    <span className="text-gray-500">{attr.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{attr.value}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'reviews' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r: any) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-900">
                          {r.user_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{r.user_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={12}
                            className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'shipping' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {[
              { icon: '🚚', title: 'Standard Shipping', desc: '3-5 business days • Free over €50' },
              { icon: '⚡', title: 'Express Shipping', desc: '1-2 business days • €4.99' },
              { icon: '🔄', title: 'Returns', desc: '30 days free returns' },
            ].map((s, i) => (
              <div key={i} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
