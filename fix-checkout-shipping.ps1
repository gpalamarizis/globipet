$root = "C:\gp"

$f1 = @'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CreditCard, Lock, ShoppingBag, ChevronRight, Check, Truck, ArrowLeft, Package } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const SHIPPING_METHODS = [
  { id: 'boxnow', label: 'BoxNow Locker', price: 2.50, desc: '1-2 εργάσιμες · Παραλαβή από locker', icon: '📦' },
  { id: 'acs',    label: 'ACS Courier',   price: 3.99, desc: '1-3 εργάσιμες · Παράδοση στην πόρτα', icon: '🚚' },
  { id: 'elta',   label: 'ΕΛΤΑ Courier',  price: 4.50, desc: '2-4 εργάσιμες · Παράδοση στην πόρτα', icon: '✉️' },
]

export default function Checkout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [step, setStep] = useState<'address' | 'shipping' | 'payment' | 'review'>('address')
  const [address, setAddress] = useState({
    full_name: user?.full_name || '',
    phone: '',
    street: '',
    city: '',
    postal_code: '',
    country: 'GR',
  })
  const [shippingMethod, setShippingMethod] = useState<string>('boxnow')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data?.data ?? []),
  })

  const selectedShipping = SHIPPING_METHODS.find(m => m.id === shippingMethod)!
  const subtotal = cartItems.reduce((sum: number, item: any) => sum + ((item.product_price ?? item.price ?? 0) * item.quantity), 0)
  const shipping = subtotal > 50 ? 0 : selectedShipping.price
  const grandTotal = subtotal + shipping

  const steps = [
    { id: 'address',  label: 'Διεύθυνση' },
    { id: 'shipping', label: 'Αποστολή' },
    { id: 'payment',  label: 'Πληρωμή' },
    { id: 'review',   label: 'Επιβεβαίωση' },
  ]

  const placeOrder = useMutation({
    mutationFn: async () => {
      const items = cartItems.map((item: any) => ({
        product_id:    item.product_id || item.id,
        product_name:  item.product_name || item.name,
        product_price: item.product_price ?? item.price ?? 0,
        product_image: item.product_image || item.image || null,
        quantity:      item.quantity,
      }))
      const { data: order } = await api.post('/orders', {
        items,
        shipping_address: { ...address, shipping_method: shippingMethod, shipping_cost: shipping },
        payment_method: paymentMethod,
        total_amount: grandTotal,
      })
      if (paymentMethod === 'card') {
        const { data: viva } = await api.post('/orders/viva/checkout', {
          order_id: order.id,
          total_amount: grandTotal,
        })
        if (viva.checkoutUrl) { window.location.href = viva.checkoutUrl; return }
      }
      return order
    },
    onSuccess: (order) => {
      if (order) { toast.success('Παραγγελία ολοκληρώθηκε! 🎉'); navigate(`/orders/${order.id}`) }
    },
    onError: (err: any) => toast.error(err?.message || 'Σφάλμα κατά την παραγγελία'),
  })

  if (cartItems.length === 0) return (
    <div className="page-container py-16 text-center">
      <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Το καλάθι σας είναι άδειο</h2>
      <button onClick={() => navigate('/marketplace')} className="btn-primary mt-4">Αγορές</button>
    </div>
  )

  const stepIdx = steps.findIndex(s => s.id === step)

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Ολοκλήρωση παραγγελίας</h1>
      </div>

      {/* Steps */}
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

          {/* Step 1: Address */}
          {step === 'address' && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Truck size={18}/> Διεύθυνση παράδοσης</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ονοματεπώνυμο</label>
                  <input className="input" value={address.full_name} onChange={e => setAddress(a => ({...a, full_name: e.target.value}))} placeholder="Γιώργος Παπαδόπουλος" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Τηλέφωνο</label>
                  <input className="input" value={address.phone} onChange={e => setAddress(a => ({...a, phone: e.target.value}))} placeholder="+30 6900000000" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Χώρα</label>
                  <select className="input" value={address.country} onChange={e => setAddress(a => ({...a, country: e.target.value}))}>
                    <option value="GR">Ελλάδα</option>
                    <option value="CY">Κύπρος</option>
                    <option value="DE">Γερμανία</option>
                    <option value="GB">Ηνωμένο Βασίλειο</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Οδός και αριθμός</label>
                  <input className="input" value={address.street} onChange={e => setAddress(a => ({...a, street: e.target.value}))} placeholder="Λεωφόρος Αθηνών 123" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                  <input className="input" value={address.city} onChange={e => setAddress(a => ({...a, city: e.target.value}))} placeholder="Αθήνα" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">ΤΚ</label>
                  <input className="input" value={address.postal_code} onChange={e => setAddress(a => ({...a, postal_code: e.target.value}))} placeholder="10431" />
                </div>
              </div>
              <button onClick={() => setStep('shipping')} disabled={!address.full_name || !address.street || !address.city}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                Συνέχεια <ChevronRight size={16}/>
              </button>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 'shipping' && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Package size={18}/> Τρόπος αποστολής</h2>
              <div className="space-y-3 mb-5">
                {SHIPPING_METHODS.map(m => (
                  <label key={m.id} className={cn('flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                    shippingMethod === m.id ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
                    <input type="radio" name="shipping" value={m.id} checked={shippingMethod === m.id} onChange={() => setShippingMethod(m.id)} className="sr-only" />
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{m.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                    </div>
                    <div className="text-right">
                      {subtotal > 50
                        ? <span className="text-sm font-bold text-green-600">Δωρεάν</span>
                        : <span className="text-sm font-bold text-gray-900 dark:text-white">€{m.price.toFixed(2)}</span>
                      }
                    </div>
                    {shippingMethod === m.id && <Check size={16} className="text-brand-900 shrink-0" />}
                  </label>
                ))}
              </div>
              {subtotal > 50 && (
                <p className="text-xs text-green-600 font-medium mb-4 text-center">🎉 Δωρεάν αποστολή για αγορές άνω των €50!</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('address')} className="btn-secondary flex-1">Πίσω</button>
                <button onClick={() => setStep('payment')} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Συνέχεια <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><CreditCard size={18}/> Τρόπος πληρωμής</h2>
              <div className="space-y-3 mb-5">
                {[
                  { id: 'card', label: 'Κάρτα / Apple Pay / Google Pay', icon: '💳' },
                  { id: 'cash', label: 'Αντικαταβολή', icon: '💵' },
                ].map(m => (
                  <label key={m.id} className={cn('flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                    paymentMethod === m.id ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700')}>
                    <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id as any)} className="sr-only" />
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-white flex-1">{m.label}</span>
                    {paymentMethod === m.id && <Check size={16} className="text-brand-900" />}
                  </label>
                ))}
              </div>
              {paymentMethod === 'card' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">Θα μεταφερθείτε στο ασφαλές περιβάλλον πληρωμής Viva Wallet</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Αποδεκτές κάρτες: Visa, Mastercard, American Express. Έως 12 άτοκες δόσεις.</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('shipping')} className="btn-secondary flex-1">Πίσω</button>
                <button onClick={() => setStep('review')} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Συνέχεια <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">Επιβεβαίωση παραγγελίας</h2>
              <div className="space-y-3 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">ΔΙΕΥΘΥΝΣΗ ΠΑΡΑΔΟΣΗΣ</p>
                  <p className="text-sm text-gray-900 dark:text-white">{address.full_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{address.street}, {address.city} {address.postal_code}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{address.phone}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">ΤΡΟΠΟΣ ΑΠΟΣΤΟΛΗΣ</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedShipping.icon} {selectedShipping.label} · {subtotal > 50 ? 'Δωρεάν' : `€${selectedShipping.price.toFixed(2)}`}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {paymentMethod === 'card' ? '💳 Κάρτα μέσω Viva Wallet' : '💵 Αντικαταβολή'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('payment')} className="btn-secondary flex-1">Πίσω</button>
                <button onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Lock size={14}/>
                  {placeOrder.isPending ? 'Επεξεργασία...' : `Παραγγελία €${grandTotal.toFixed(2)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="card p-5 h-fit sticky top-20">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Σύνοψη παραγγελίας</h3>
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
                <p className="text-sm font-semibold text-gray-900 dark:text-white">€{((item.product_price ?? item.price ?? 0) * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Υποσύνολο</span><span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Μεταφορικά</span>
              <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'Δωρεάν' : `€${shipping.toFixed(2)}`}</span>
            </div>
            {subtotal > 50 && <p className="text-xs text-green-600">🎉 Δωρεάν αποστολή!</p>}
            <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Σύνολο</span><span>€{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
            <Lock size={12}/> Ασφαλής πληρωμή με κρυπτογράφηση SSL
          </div>
        </div>
      </div>
    </div>
  )
}
'@
Set-Content -Path (Join-Path $root "apps\web\src\pages\Checkout.tsx") -Value $f1 -Encoding UTF8 -NoNewline
Write-Host "OK: Checkout.tsx"