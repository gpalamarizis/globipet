import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

/**
 * Saved products.
 *
 * The heart button on product cards and the product page has been writing to
 * /wishlist all along, but this route rendered a "page under development"
 * placeholder — so everything anyone saved was invisible.
 *
 * Prices come from the wishlist row, which the server refreshes from the
 * products table, so a price drop since saving shows up here.
 */
export default function Wishlist() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const remove = useMutation({
    // POST toggles — it removes the product when it is already saved. The
    // DELETE route expects the wishlist row id, not the product id.
    mutationFn: (productId: string) => api.post('/wishlist', { product_id: productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success(t('wishlist.removed', 'Αφαιρέθηκε από τα αγαπημένα'))
    },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const addToCart = useMutation({
    mutationFn: (productId: string) => api.post('/cart', { product_id: productId, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success(t('cart.added', 'Προστέθηκε στο καλάθι!'))
    },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  if (!isAuthenticated) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">
        {t('authExtra.requiredTitle', 'Απαιτείται σύνδεση')}
      </p>
      <Link to="/login" className="btn-primary inline-block">{t('auth.login', 'Σύνδεση')}</Link>
    </div>
  )

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <Heart size={20} className="text-red-500" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t('wishlist.title', 'Αγαπημένα')}
          </h1>
          <p className="text-sm text-gray-500">
            {items.length} {t('wishlist.saved', 'αποθηκευμένα προϊόντα')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card p-4"><div className="skeleton h-20 w-full" /></div>)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">
            {t('wishlist.empty', 'Δεν έχεις αγαπημένα ακόμη')}
          </h3>
          <p className="text-gray-500 mb-6 text-sm">
            {t('wishlist.emptyDesc', 'Πάτα την καρδιά σε ό,τι σου αρέσει για να το βρεις εύκολα εδώ.')}
          </p>
          <Link to="/marketplace" className="btn-primary">
            {t('wishlist.browse', 'Δες το κατάστημα')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((item: any, i: number) => (
              <motion.div key={item.id} layout
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.03 }}
                className="card p-4 flex items-center gap-4">

                <Link to={`/marketplace/${item.product_id}`} className="shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                    {item.product_image
                      ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      : <Package size={22} className="text-gray-300" />}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/marketplace/${item.product_id}`}
                    className="font-medium text-sm text-gray-900 dark:text-white hover:text-brand-900 line-clamp-2">
                    {item.product_name}
                  </Link>
                  <p className="font-bold text-brand-900 dark:text-yellow-400 mt-1">
                    {formatCurrency(item.product_price)}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => addToCart.mutate(item.product_id)}
                    disabled={addToCart.isPending}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <ShoppingCart size={13} /> {t('wishlist.toCart', 'Καλάθι')}
                  </button>
                  <button
                    onClick={() => remove.mutate(item.product_id)}
                    disabled={remove.isPending}
                    className="text-xs py-1.5 px-3 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5 transition-colors">
                    <Trash2 size={13} /> {t('common.delete', 'Διαγραφή')}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
