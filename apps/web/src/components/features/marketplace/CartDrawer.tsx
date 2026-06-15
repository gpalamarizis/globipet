import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { formatCurrency } from '@/lib/utils'

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: cart = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data?.data ?? []),
    enabled: !!user && open,
  })

  const updateQty = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      qty <= 0 ? api.delete(`/cart/${id}`) : api.patch(`/cart/${id}`, { quantity: qty }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })

  const total = cart.reduce((s: number, i: any) => s + i.product_price * i.quantity, 0)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50" onClick={onClose}/>
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-modal z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold flex items-center gap-2"><ShoppingCart size={18}/>Καλάθι ({cart.length})</h2>
              <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ShoppingCart size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Το καλάθι σας είναι άδειο</p>
                </div>
              ) : cart.map((item: any) => (
                <div key={item.id} className="flex gap-3 items-center">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                    {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product_name}</p>
                    <p className="text-sm font-bold text-brand-900 mt-0.5">{formatCurrency(item.product_price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty.mutate({ id: item.id, qty: item.quantity - 1 })} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Minus size={12}/></button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty.mutate({ id: item.id, qty: item.quantity + 1 })} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Plus size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between mb-4">
                  <span className="text-sm text-gray-500">Σύνολο</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(total)}</span>
                </div>
                <Link to="/checkout" onClick={onClose} className="btn-primary w-full flex items-center justify-center gap-2">
                  Ολοκλήρωση αγοράς <ArrowRight size={16}/>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
