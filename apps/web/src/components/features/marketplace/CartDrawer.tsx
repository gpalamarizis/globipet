import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Minus, ShoppingCart, ArrowRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { FREE_SHIPPING_OVER } from '@/lib/shipping'

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const { data: cart = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data?.data ?? []),
    enabled: !!user && open,
  })

  const updateQty = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      qty <= 0 ? api.delete(`/cart/${id}`) : api.patch(`/cart/${id}`, { quantity: qty }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    // Αποτυχία περνούσε σιωπηλά· το κινητό δείχνει μήνυμα.
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const total = cart.reduce((s: number, i: any) => s + i.product_price * i.quantity, 0)

  // Δωρεάν μεταφορικά: με το ποσό ΜΕΤΑ την έκπτωση καμπάνιας, όπως το ταμείο
  // (Checkout.tsx — ίδιο quote, ίδιο queryKey, άρα κοινή μνήμη). Μέχρι να
  // έρθει το quote δεν υποσχόμαστε δωρεάν αποστολή.
  const quoteItems = cart.map((i: any) => ({ type: 'product', id: i.product_id || i.id, qty: i.quantity }))
  const { data: quote } = useQuery({
    queryKey: ['quote-cart', quoteItems],
    queryFn: () => api.post('/campaigns/quote', { items: quoteItems }).then(r => r.data?.data),
    enabled: !!user && open && quoteItems.length > 0,
  })
  const afterDiscount = quote
    ? Math.round((Number(quote.subtotal) - Number(quote.discount)) * 100) / 100
    : null
  const freeShipping = afterDiscount != null && afterDiscount > FREE_SHIPPING_OVER

  if (!open) return null

  return (
    <>
      {/* Overlay — z-[100] to sit above checkout and any other page content */}
      <div className="fixed inset-0 bg-black/40 z-[100]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-modal z-[101] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold flex items-center gap-2"><ShoppingCart size={18}/>{t('cmpCart.title', { count: cart.length })}</h2>
          <button onClick={onClose} className="btn-ghost p-2" aria-label={t('common.close')}><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingCart size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">{t('cart.empty')}</p>
              <Link to="/marketplace" onClick={onClose} className="btn-primary inline-block mt-4 text-sm">{t('checkout.goShop')}</Link>
            </div>
          ) : cart.map((item: any) => (
            <div key={item.id} className="flex gap-3 items-center">
              {/* Σύνδεσμος στο προϊόν, όπως στο καλάθι του κινητού. */}
              <Link to={`/marketplace/${item.product_id}`} onClick={onClose} className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/marketplace/${item.product_id}`} onClick={onClose} className="block text-sm font-medium text-gray-900 dark:text-white truncate hover:text-brand-900">{item.product_name}</Link>
                <p className="text-sm font-bold text-brand-900 mt-0.5">{formatCurrency(item.product_price)}</p>
              </div>
              <div className="flex items-center gap-1">
                {/* Στο 1 το μείον αφαιρεί το είδος (κάδος), όπως στο κινητό. */}
                <button onClick={() => updateQty.mutate({ id: item.id, qty: item.quantity - 1 })} disabled={updateQty.isPending}
                  aria-label={item.quantity <= 1 ? t('common.remove') : undefined}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50">
                  {item.quantity <= 1 ? <Trash2 size={12} className="text-red-500"/> : <Minus size={12}/>}
                </button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                {/* Ο server κόβει στα 99 (routes/cart.ts). */}
                <button onClick={() => updateQty.mutate({ id: item.id, qty: item.quantity + 1 })} disabled={updateQty.isPending || item.quantity >= 99}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"><Plus size={12}/></button>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex justify-between mb-4">
              <div>
                <span className="text-sm text-gray-500">{t('cart.total')}</span>
                {/* Τα μεταφορικά προστίθενται στο ταμείο — λέγεται εδώ, όπως στο κινητό. */}
                <p className="text-xs text-gray-400">
                  {freeShipping ? t('cart.freeShipping') : t('cart.shippingNote')}
                </p>
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(total)}</span>
            </div>
            <Link to="/checkout" onClick={onClose} className="btn-primary w-full flex items-center justify-center gap-2">
              {t('cart.checkout')} <ArrowRight size={16}/>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}