import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, ShoppingBag, ChevronRight, Check, Truck, ArrowLeft, Package, Tag } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FREE_SHIPPING_OVER } from '@/lib/shipping'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Ολοκλήρωση αγοράς — ίδια ροή και ίδια πεδία με το κινητό.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   · Αφαιρέθηκε η «Αντικαταβολή»: η παραγγελία έμενε απλήρωτη για πάντα,
 *     ο πάροχος δεν ειδοποιούνταν ποτέ, κι ο πελάτης έβλεπε «ολοκληρώθηκε».
 *     Κανόνας: κάθε παραγγελία πληρώνεται στο Viva πριν επιβεβαιωθεί.
 *   · Η έκπτωση καμπάνιας φαίνεται πριν την πληρωμή (POST /campaigns/quote,
 *     τιμές της βάσης). Ο server υπολογίζει ξανά τα ίδια όταν δημιουργεί
 *     την παραγγελία — τίποτα από εδώ δεν είναι δεσμευτικό.
 *   · Τα μεταφορικά: δωρεάν όταν το ποσό ΜΕΤΑ την έκπτωση ξεπερνά το όριο,
 *     όπως τα υπολογίζει ο server.
 *   · Όλα τα κείμενα σε 5 γλώσσες (ήταν σταθερά ελληνικά).
 */
const SHIPPING = [
  { id: 'boxnow', label: 'BOX NOW', subKey: 'checkout.locker', price: 2.5, icon: '📦' },
  { id: 'acs',    label: 'ACS',     subKey: 'checkout.home_1_3', price: 3.99, icon: '🚚' },
  { id: 'elta',   labelKey: 'checkout.elta', subKey: 'checkout.home_3_5', price: 4.5, icon: '✉️' },
] as const

type Step = 'address' | 'shipping' | 'review'

export default function Checkout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [step, setStep] = useState<Step>('address')
  const [address, setAddress] = useState({
    full_name: user?.full_name || '',
    phone: (user as any)?.phone || '',
    street: '',
    city: '',
    postal_code: '',
    notes: '',
  })
  const [shippingMethod, setShippingMethod] = useState<string>('boxnow')

  const { data: cartItems = [], isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data?.data ?? []),
  })

  const quoteItems = cartItems.map((i: any) => ({ type: 'product', id: i.product_id || i.id, qty: i.quantity }))
  const { data: quote } = useQuery({
    queryKey: ['quote-cart', quoteItems],
    queryFn: () => api.post('/campaigns/quote', { items: quoteItems }).then(r => r.data?.data),
    enabled: quoteItems.length > 0,
  })

  const selected = SHIPPING.find(m => m.id === shippingMethod) ?? SHIPPING[0]
  const listSubtotal = cartItems.reduce((sum: number, item: any) => sum + ((item.product_price ?? item.price ?? 0) * item.quantity), 0)
  const subtotal = quote ? Number(quote.subtotal) : listSubtotal
  const discount = quote ? Number(quote.discount) : 0
  const afterDiscount = Math.round((subtotal - discount) * 100) / 100
  const free = afterDiscount > FREE_SHIPPING_OVER
  const shipping = free ? 0 : selected.price
  const grandTotal = afterDiscount + shipping

  // Μία γραμμή ανά καμπάνια, με το άθροισμα της έκπτωσης.
  const discountLines: { title: string; amount: number }[] = []
  for (const it of quote?.items ?? []) {
    if (!it.campaign || !(it.discount > 0)) continue
    const row = discountLines.find(d => d.title === it.campaign.title)
    if (row) row.amount += it.discount
    else discountLines.push({ title: it.campaign.title, amount: it.discount })
  }

  const steps: { id: Step; label: string }[] = [
    { id: 'address',  label: t('checkout.stepAddress') },
    { id: 'shipping', label: t('checkout.stepShipping') },
    { id: 'review',   label: t('checkout.stepReview') },
  ]

  const placeOrder = useMutation({
    mutationFn: async () => {
      // Μόνο προϊόν και ποσότητα. Τιμές, έκπτωση, μεταφορικά και σύνολο τα
      // υπολογίζει ο server.
      const items = cartItems.map((item: any) => ({
        product_id: item.product_id || item.id,
        quantity:   item.quantity,
      }))
      const { data: order } = await api.post('/orders', {
        items,
        shipping_address: { ...address, shipping_method: shippingMethod },
        payment_method: 'viva',
      })
      const orderId = order?.data?.id ?? order?.id
      if (!orderId) throw new Error(t('checkout.err_no_order'))
      const { data: viva } = await api.post('/orders/viva/checkout', { order_id: orderId })
      if (viva?.checkoutUrl) { window.location.href = viva.checkoutUrl; return }
      throw new Error(t('checkout.err_no_page'))
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || t('checkout.err_order')),
  })

  const addressOk = !!(address.full_name.trim() && address.phone.trim() && address.street.trim()
    && address.city.trim() && address.postal_code.trim())

  // Όσο φορτώνει το καλάθι, η κενή λίστα δεν σημαίνει «άδειο καλάθι» — αλλιώς
  // εμφανιζόταν στιγμιαία «Το καλάθι είναι άδειο». Το κινητό δείχνει φόρτωση.
  if (cartLoading) return (
    <div className="page-container py-24 flex flex-col items-center gap-3">
      <LoadingSpinner />
      <p className="text-sm text-gray-500">{t('checkout.loading_cart')}</p>
    </div>
  )

  if (cartItems.length === 0) return (
    <div className="page-container py-16 text-center">
      <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('checkout.empty')}</h2>
      <button onClick={() => navigate('/marketplace')} className="btn-primary mt-4">{t('checkout.goShop')}</button>
    </div>
  )

  const stepIdx = steps.findIndex(s => s.id === step)
  const money = (n: number) => `€${n.toFixed(2)}`

  const field = (key: keyof typeof address, label: string, opts: { full?: boolean; type?: string; placeholder?: string } = {}) => (
    <div className={opts.full ? 'col-span-2' : ''}>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <input className="input" type={opts.type || 'text'} value={address[key]} placeholder={opts.placeholder}
        onChange={e => setAddress(a => ({ ...a, [key]: e.target.value }))} />
    </div>
  )

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" aria-label={t('checkout.back')}><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('checkout.pageTitle')}</h1>
      </div>

      {/* Βήματα */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={cn('flex items-center gap-2', step === s.id ? 'text-brand-900' : i < stepIdx ? 'text-green-600' : 'text-gray-400')}>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                step === s.id ? 'border-brand-900 bg-brand-50 text-brand-900' :
                i < stepIdx ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 text-gray-400')}>
                {i < stepIdx ? <Check size={14}/> : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn('w-10 h-0.5 mx-2', i < stepIdx ? 'bg-green-500' : 'bg-gray-200')} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {step === 'address' && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Truck size={18}/> {t('checkout.delivery')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {field('full_name', t('checkout.fullName'), { full: true })}
                {field('phone', t('checkout.phone'), { type: 'tel' })}
                {field('postal_code', t('checkout.postcode'))}
                {field('street', t('checkout.address'), { full: true, placeholder: t('checkout.street') })}
                {field('city', t('checkout.city'), { full: true })}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('checkout.notes')}</label>
                  <textarea className="input" rows={2} value={address.notes} placeholder={t('checkout.notes_hint')}
                    onChange={e => setAddress(a => ({ ...a, notes: e.target.value }))} />
                </div>
              </div>
              <button onClick={() => setStep('shipping')} disabled={!addressOk}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                {t('checkout.continue')} <ChevronRight size={16}/>
              </button>
              {!addressOk && <p className="text-xs text-gray-400 text-center mt-2">{t('checkout.fill_delivery')}</p>}
            </div>
          )}

          {step === 'shipping' && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Package size={18}/> {t('checkout.shipping_method')}</h2>
              <div className="space-y-3 mb-5">
                {SHIPPING.map(m => (
                  <label key={m.id} className={cn('flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                    shippingMethod === m.id ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
                    <input type="radio" name="shipping" value={m.id} checked={shippingMethod === m.id} onChange={() => setShippingMethod(m.id)} className="sr-only" />
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{'labelKey' in m ? t(m.labelKey) : m.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t(m.subKey)}</p>
                    </div>
                    <span className={cn('text-sm font-bold', free ? 'text-green-600' : 'text-gray-900 dark:text-white')}>
                      {free ? t('checkout.free') : money(m.price)}
                    </span>
                    {shippingMethod === m.id && <Check size={16} className="text-brand-900 shrink-0" />}
                  </label>
                ))}
              </div>
              <p className={cn('text-xs font-medium mb-4 text-center', free ? 'text-green-600' : 'text-gray-500')}>
                {t('checkout.free_over', { amount: FREE_SHIPPING_OVER })}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep('address')} className="btn-secondary flex-1">{t('checkout.back')}</button>
                <button onClick={() => setStep('review')} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {t('checkout.continue')} <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t('checkout.stepReview')}</h2>
              <div className="space-y-3 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">{t('checkout.delivery')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{address.full_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{address.street}, {address.city} {address.postal_code}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{address.phone}</p>
                  {!!address.notes && <p className="text-sm text-gray-500 mt-1">{address.notes}</p>}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">{t('checkout.shipping_method')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selected.icon} {'labelKey' in selected ? t(selected.labelKey) : selected.label} · {free ? t('checkout.free') : money(selected.price)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-600 font-medium">{t('checkout.viva_note')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{t('checkout.cardInfo')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('shipping')} className="btn-secondary flex-1">{t('checkout.back')}</button>
                <button onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending || !addressOk}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Lock size={14}/>
                  {placeOrder.isPending ? t('checkout.creating_order') : t('checkout.pay_amount', { amount: grandTotal.toFixed(2) })}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Σύνοψη */}
        <div className="card p-5 h-fit sticky top-20">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t('checkout.summary')}</h3>
          <div className="space-y-3 mb-4">
            {cartItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm shrink-0">
                  {(item.product_image ?? item.image) ? <img src={item.product_image ?? item.image} alt="" className="w-full h-full object-cover rounded-lg"/> : '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product_name ?? item.name}</p>
                  <p className="text-xs text-gray-500">x{item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{money((item.product_price ?? item.price ?? 0) * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('checkout.products')}</span><span>{money(subtotal)}</span>
            </div>
            {discountLines.map(d => (
              <div key={d.title} className="flex items-start justify-between gap-3 text-sm text-green-700 dark:text-green-400">
                {/* Αναδίπλωση αντί για «…»: ο τίτλος της καμπάνιας πρέπει να διαβάζεται ολόκληρος. */}
                <span className="flex items-start gap-1.5 min-w-0"><Tag size={13} className="shrink-0 mt-[3px]"/><span className="break-words">{t('campaignDiscount.line', { title: d.title })}</span></span>
                <span className="shrink-0">−{money(d.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('checkout.shipping')}</span>
              <span className={free ? 'text-green-600 font-medium' : ''}>{free ? t('checkout.free') : money(shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>{t('checkout.total')}</span><span>{money(grandTotal)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
            <Lock size={12}/> {t('productInfo.securePayment')}
          </div>
        </div>
      </div>
    </div>
  )
}
